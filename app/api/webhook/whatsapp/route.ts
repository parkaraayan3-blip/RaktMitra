// ──────────────────────────────────────────────
// API Route: /api/webhook/whatsapp
// ──────────────────────────────────────────────
// Handles WhatsApp Cloud API webhook verification and incoming messages.
// Verifies webhook signature for security.

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import crypto from 'crypto';

const WA_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WA_APP_SECRET = process.env.WHATSAPP_APP_SECRET;

// GET — Webhook verification (Meta sends this to verify endpoint)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === WA_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// POST — Incoming messages and status updates
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Verify webhook signature if app secret is configured
    if (WA_APP_SECRET) {
      const signature = request.headers.get('x-hub-signature-256');
      if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }

      const expectedSignature =
        'sha256=' +
        crypto.createHmac('sha256', WA_APP_SECRET).update(rawBody).digest('hex');

      const sigBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSignature);

      if (
        sigBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
      ) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);

    // Process status updates
    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;

        // Handle message status updates (sent, delivered, read)
        if (value.statuses) {
          for (const status of value.statuses) {
            await handleStatusUpdate(status);
          }
        }

        // Handle incoming messages (donor responses)
        if (value.messages) {
          for (const message of value.messages) {
            await handleIncomingMessage(message, value.contacts?.[0]);
          }
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[webhook] Error:', error);
    return NextResponse.json({ success: true }, { status: 200 }); // Always 200 for webhooks
  }
}

async function handleStatusUpdate(status: {
  id: string;
  status: string;
  timestamp: string;
}) {
  // Find notification attempt by WhatsApp message ID
  const snapshot = await adminDb
    .collection('notificationAttempts')
    .where('waMessageId', '==', status.id)
    .limit(1)
    .get();

  if (snapshot.empty) return;

  const doc = snapshot.docs[0];
  const updates: Record<string, unknown> = {};

  switch (status.status) {
    case 'delivered':
      updates.status = 'delivered';
      updates.deliveredAt = new Date(parseInt(status.timestamp) * 1000).toISOString();
      break;
    case 'read':
      updates.status = 'read';
      break;
    case 'failed':
      updates.status = 'failed';
      updates.failureReason = 'Message delivery failed';
      break;
  }

  if (Object.keys(updates).length > 0) {
    await doc.ref.update(updates);
  }
}

async function handleIncomingMessage(
  message: { from: string; text?: { body: string }; type: string },
  contact?: { profile?: { name: string } }
) {
  if (message.type !== 'text' || !message.text?.body) return;

  const responseText = message.text.body.trim().toLowerCase();
  const phone = message.from;

  // Find the donor by phone number
  const donorSnap = await adminDb
    .collection('donors')
    .where('phone', '==', phone)
    .limit(1)
    .get();

  // Also try with +91 prefix
  let donorDoc = donorSnap.docs[0];
  if (!donorDoc) {
    const altSnap = await adminDb
      .collection('donors')
      .where('phone', '==', `+91${phone}`)
      .limit(1)
      .get();
    donorDoc = altSnap.docs[0];
  }

  if (!donorDoc) return;

  const donorId = donorDoc.id;

  // Determine response type
  let matchStatus: string;
  if (/^(yes|available|haan|ha|ready|can help)/i.test(responseText)) {
    matchStatus = 'available';
  } else if (/^(no|unavailable|nahi|nahin|can't|cannot|not available)/i.test(responseText)) {
    matchStatus = 'unavailable';
  } else if (/^(call|call me|mujhe call|phone)/i.test(responseText)) {
    matchStatus = 'call_me';
  } else {
    matchStatus = 'available'; // Default to available for any positive-seeming response
  }

  // Find the most recent active notification for this donor
  const notifSnap = await adminDb
    .collection('notificationAttempts')
    .where('donorId', '==', donorId)
    .where('status', 'in', ['sent', 'delivered', 'read'])
    .orderBy('sentAt', 'desc')
    .limit(1)
    .get();

  if (notifSnap.empty) return;

  const notifDoc = notifSnap.docs[0];
  const requestId = notifDoc.data().requestId;

  // Update match status
  await adminDb
    .collection('emergencyRequests')
    .doc(requestId)
    .collection('matches')
    .doc(donorId)
    .update({
      status: matchStatus,
      respondedAt: new Date().toISOString(),
    });

  // Log audit event
  await adminDb.collection('auditEvents').add({
    type: 'donor_response',
    requestId,
    donorId,
    response: matchStatus,
    rawMessage: message.text.body,
    timestamp: new Date().toISOString(),
  });
}
