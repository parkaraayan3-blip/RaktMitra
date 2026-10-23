// ──────────────────────────────────────────────
// API Route: /api/donors/register
// ──────────────────────────────────────────────
// Registers a new donor profile in Firestore.
// Enforces Zod schema validation & separates public profile from private screening data.

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { donorRegistrationSchema } from '@/lib/types';
import type { DonorProfile, DonorPrivate } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();

    // 1. Zod schema validation
    const validation = donorRegistrationSchema.safeParse(rawBody);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      const errorMessage = firstIssue ? `${firstIssue.path.join('.')}: ${firstIssue.message}` : 'Validation failed';
      return NextResponse.json(
        { success: false, error: errorMessage, details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;
    const uid = rawBody.uid || `donor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    // 2. Public donor profile (for discovery & matching)
    const donorProfile: DonorProfile = {
      uid,
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
      bloodGroup: data.bloodGroup,
      dateOfBirth: data.dateOfBirth,
      locality: data.locality,
      city: data.city,
      location: data.location || null,
      lastDonationDate: data.lastDonationDate || null,
      donationFrequency: data.donationFrequency,
      isAvailable: data.isAvailable,
      whatsappOptIn: true,
      privacyConsent: true,
      createdAt: now,
      updatedAt: now,
    };

    // 3. Private screening data (RESTRICTED — server-side only)
    const donorPrivate: DonorPrivate = {
      uid,
      screeningDisclosures: data.screeningDisclosures,
      medicalNotes: data.medicalNotes,
      hasKnownScreeningFlags: data.screeningDisclosures.length > 0,
    };

    // 4. Atomic batch write
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
  } catch (error: any) {
    console.error('[register] Error:', error);
    const errorMessage = error?.message || 'Internal server error during registration.';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
