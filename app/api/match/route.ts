// ──────────────────────────────────────────────
// API Route: /api/match
// ──────────────────────────────────────────────
// Accepts an extraction result and returns matching donors from Firestore.
// All matching logic runs server-side. No private data is exposed.

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { matchDonors, toMatchRecord, type MatchQuery } from '@/lib/matching';
import type { DonorProfile, DonorPrivate, BloodGroup, BloodComponent } from '@/lib/types';
import { BLOOD_GROUPS, BLOOD_COMPONENTS } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { bloodGroup, component, hospitalLat, hospitalLng, searchRadiusKm } = body;

    if (!bloodGroup || !BLOOD_GROUPS.includes(bloodGroup)) {
      return NextResponse.json(
        { success: false, error: 'Valid bloodGroup is required.' },
        { status: 400 }
      );
    }

    if (component && !BLOOD_COMPONENTS.includes(component)) {
      return NextResponse.json(
        { success: false, error: 'Invalid blood component.' },
        { status: 400 }
      );
    }

    if (typeof hospitalLat !== 'number' || typeof hospitalLng !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Hospital coordinates (hospitalLat, hospitalLng) are required.' },
        { status: 400 }
      );
    }

    // Query Firestore for donors
    const donorsSnap = await adminDb.collection('donors').get();
    const donors: DonorProfile[] = [];
    donorsSnap.forEach((doc) => {
      donors.push(doc.data() as DonorProfile);
    });

    // Query private data (server-only)
    const privateSnap = await adminDb.collection('donorPrivate').get();
    const privateData = new Map<string, DonorPrivate>();
    privateSnap.forEach((doc) => {
      privateData.set(doc.id, doc.data() as DonorPrivate);
    });

    // Run matching engine
    const query: MatchQuery = {
      recipientBloodGroup: bloodGroup as BloodGroup,
      component: (component as BloodComponent) ?? null,
      hospitalLat,
      hospitalLng,
      searchRadiusKm: searchRadiusKm ?? undefined,
    };

    const candidates = matchDonors(query, donors, privateData);
    const matches = candidates.map(toMatchRecord);

    return NextResponse.json({
      success: true,
      data: {
        totalDonorsSearched: donors.length,
        matchCount: matches.length,
        isProvisional: !component,
        matches,
      },
    });
  } catch (error) {
    console.error('[match] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during matching.' },
      { status: 500 }
    );
  }
}
