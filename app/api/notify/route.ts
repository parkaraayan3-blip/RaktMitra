// ──────────────────────────────────────────────
// API Route: /api/notify
// ──────────────────────────────────────────────
// Sends WhatsApp availability requests to opted-in donors via Meta Cloud API.
// Implements idempotency to prevent duplicate notifications.

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

const WA_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WA_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WA_API_VERSION = 'v21.0';

interface NotifyPayload {
  requestId: string;
  donorId: string;
  donorPhone: string;
  donorName: string;
  bloodGroup: string;
  hospital: string;
  urgency: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!WA_PHONE_NUMBER_ID || !WA_ACCESS_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'WhatsApp API not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN.' },
        { status: 503 }
      );
    }

    const body: NotifyPayload = await request.json();
    const { requestId, donorId, donorPhone, donorName, bloodGroup, hospital, urgency } = body;

    // Validate required fields
    if (!requestId || !donorId || !donorPhone || !donorName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: requestId, donorId, donorPhone, donorName.' },
        { status: 400 }
      );
    }

    // Idempotency check — prevent duplicate notifications
    const existingNotifications = await adminDb
      .collection('notificationAttempts')
      .where('requestId', '==', requestId)
      .where('donorId', '==', donorId)
      .where('status', 'in', ['queued', 'sent', 'delivered', 'read'])
      .get();

    if (!existingNotifications.empty) {
      return NextResponse.json({
        success: true,
        data: { alreadySent: true, message: 'Notification already sent to this donor for this request.' },
      });
    }

    // Create notification attempt record
    const attemptRef = adminDb.collection('notificationAttempts').doc();
    const attemptData = {
      id: attemptRef.id,
      requestId,
      donorId,
      channel: 'whatsapp',
      templateName: 'blood_request_availability',
      recipientPhone: donorPhone,
      status: 'queued',
      waMessageId: null,
      sentAt: null,
      deliveredAt: null,
      failureReason: null,
    };

    await attemptRef.set(attemptData);

    // Format phone number (ensure country code)
    const formattedPhone = donorPhone.startsWith('+')
      ? donorPhone.replace(/[^0-9]/g, '')
      : `91${donorPhone.replace(/[^0-9]/g, '')}`;

    // Send WhatsApp message via Meta Cloud API
    // Using a template message for production compliance
    const waPayload = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: 'blood_request_availability',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: donorName },
              { type: 'text', text: bloodGroup },
              { type: 'text', text: hospital || 'Not specified' },
              { type: 'text', text: urgency || 'Urgent' },
            ],
          },
        ],
      },
    };

    const waResponse = await fetch(
      `https://graph.facebook.com/${WA_API_VERSION}/${WA_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WA_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(waPayload),
      }
    );

    const waResult = await waResponse.json();

    if (waResponse.ok && waResult.messages?.[0]?.id) {
      // Update notification as sent
      await attemptRef.update({
        status: 'sent',
        waMessageId: waResult.messages[0].id,
        sentAt: new Date().toISOString(),
      });

      // Update match status in emergency request
      await adminDb
        .collection('emergencyRequests')
        .doc(requestId)
        .collection('matches')
        .doc(donorId)
        .update({
          status: 'contacted',
          whatsappSent: true,
          whatsappSentAt: new Date().toISOString(),
          notificationAttemptId: attemptRef.id,
        });

      return NextResponse.json({
        success: true,
        data: {
          attemptId: attemptRef.id,
          waMessageId: waResult.messages[0].id,
          status: 'sent',
        },
      });
    } else {
      // Update notification as failed
      const failureReason = waResult.error?.message || JSON.stringify(waResult);
      await attemptRef.update({
        status: 'failed',
        failureReason,
      });

      return NextResponse.json(
        {
          success: false,
          error: `WhatsApp API error: ${failureReason}`,
          data: { attemptId: attemptRef.id },
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('[notify] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during notification.' },
      { status: 500 }
    );
  }
}
