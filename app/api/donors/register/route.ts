// ──────────────────────────────────────────────
// API Route: /api/donors/register
// ──────────────────────────────────────────────
// Registers a new donor profile in Firestore.
// Separates public profile from private screening data.

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { BLOOD_GROUPS } from '@/lib/types';
import type { DonorProfile, DonorPrivate } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const required = ['fullName', 'phone', 'email', 'bloodGroup', 'dateOfBirth', 'locality', 'city'];
    const missing = required.filter((f) => !body[f]);
    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate blood group
    if (!BLOOD_GROUPS.includes(body.bloodGroup)) {
      return NextResponse.json(
        { success: false, error: 'Invalid blood group.' },
        { status: 400 }
      );
    }

    // Validate consent
    if (!body.whatsappOptIn || !body.privacyConsent) {
      return NextResponse.json(
        { success: false, error: 'WhatsApp opt-in and privacy consent are required.' },
        { status: 400 }
      );
    }

    // Generate a UID (in production, use Firebase Auth UID)
    const uid = body.uid || `donor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    // Public donor profile
    const donorProfile: DonorProfile = {
      uid,
      fullName: body.fullName,
      phone: body.phone,
      email: body.email,
      bloodGroup: body.bloodGroup,
      dateOfBirth: body.dateOfBirth,
      locality: body.locality,
      city: body.city,
      location: body.location || null,
      lastDonationDate: body.lastDonationDate || null,
      donationFrequency: body.donationFrequency || 'first_time',
      isAvailable: body.isAvailable !== false,
      whatsappOptIn: true,
      privacyConsent: true,
      createdAt: now,
      updatedAt: now,
    };

    // Private screening data (restricted collection)
    const donorPrivate: DonorPrivate = {
      uid,
      screeningDisclosures: body.screeningDisclosures || [],
      medicalNotes: body.medicalNotes || '',
      hasKnownScreeningFlags: (body.screeningDisclosures?.length ?? 0) > 0,
    };

    // Write both atomically
    const batch = adminDb.batch();
    batch.set(adminDb.collection('donors').doc(uid), donorProfile);
    batch.set(adminDb.collection('donorPrivate').doc(uid), donorPrivate);
    await batch.commit();

    return NextResponse.json({
      success: true,
      data: {
        uid,
        message: 'Donor registered successfully.',
      },
    });
  } catch (error) {
    console.error('[register] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during registration.' },
      { status: 500 }
    );
  }
}
