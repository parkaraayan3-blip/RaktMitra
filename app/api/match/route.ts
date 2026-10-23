// ──────────────────────────────────────────────
// API Route: /api/match
// ──────────────────────────────────────────────
// Accepts an extraction result and returns matching donors from Firestore.
// High-efficiency implementation:
// 1. Applies database-level filtering for compatibility and availability.
// 2. Limits query bounds to prevent full-collection scans.
// 3. Batches private health screening checks ONLY for top geographic candidates.
// 4. Rate-limited to prevent scraping of donor coordinates.

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getCompatibleDonorGroups } from '@/lib/blood-compatibility';
import { haversineDistance } from '@/lib/haversine';
import { isDonationCooldownPassed, toMatchRecord } from '@/lib/matching';
import { checkRateLimit } from '@/lib/rate-limit';
import type { DonorProfile, DonorPrivate, BloodGroup, BloodComponent } from '@/lib/types';
import { BLOOD_GROUPS, BLOOD_COMPONENTS } from '@/lib/types';

const MAX_CANDIDATES_TO_RETURN = 20;
const DEFAULT_SEARCH_RADIUS_KM = 50;
const FIRESTORE_CANDIDATE_LIMIT = 100;

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting check
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const rateCheck = checkRateLimit(`match_${clientIp}`, 30, 60 * 1000);
    if (!rateCheck.success) {
      return NextResponse.json(
        { success: false, error: 'Too many matching requests. Please wait a minute.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { bloodGroup, component, hospitalLat, hospitalLng, searchRadiusKm } = body;

    // 2. Input validation
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

    const recipientGroup = bloodGroup as BloodGroup;
    const bloodComp = (component as BloodComponent) ?? null;
    const searchRadius = typeof searchRadiusKm === 'number' && searchRadiusKm > 0 ? searchRadiusKm : DEFAULT_SEARCH_RADIUS_KM;
    const compatibleGroups = getCompatibleDonorGroups(recipientGroup, bloodComp);

    // 3. Database-level filtered query (O(K) instead of O(N))
    let donors: DonorProfile[] = [];
    try {
      let donorQuery = adminDb
        .collection('donors')
        .where('isAvailable', '==', true)
        .where('whatsappOptIn', '==', true);

      if (compatibleGroups.length > 0 && compatibleGroups.length <= 10) {
        donorQuery = donorQuery.where('bloodGroup', 'in', compatibleGroups);
      }

      const donorsSnap = await donorQuery.limit(FIRESTORE_CANDIDATE_LIMIT).get();
      donorsSnap.forEach((doc) => {
        donors.push(doc.data() as DonorProfile);
      });
    } catch (queryErr) {
      // Graceful fallback if composite index is still building in a newly created Firebase project
      console.warn('[match] Indexed query fallback triggered:', queryErr);
      const fallbackSnap = await adminDb.collection('donors').limit(FIRESTORE_CANDIDATE_LIMIT).get();
      fallbackSnap.forEach((doc) => {
        donors.push(doc.data() as DonorProfile);
      });
    }

    // 4. In-memory deterministic distance and cooldown ranking
    interface CandidateWithDistance {
      donor: DonorProfile;
      distanceKm: number;
    }

    const geoCandidates: CandidateWithDistance[] = [];

    for (const donor of donors) {
      // Blood group compatibility check
      if (!compatibleGroups.includes(donor.bloodGroup)) continue;

      // Availability and consent
      if (!donor.isAvailable || !donor.whatsappOptIn) continue;

      // Cooldown check (56 days)
      if (!isDonationCooldownPassed(donor.lastDonationDate)) continue;

      // Proximity check
      if (!donor.location || typeof donor.location.lat !== 'number' || typeof donor.location.lng !== 'number') {
        continue;
      }

      const distanceKm = haversineDistance(
        hospitalLat,
        hospitalLng,
        donor.location.lat,
        donor.location.lng
      );

      if (distanceKm <= searchRadius) {
        geoCandidates.push({ donor, distanceKm });
      }
    }

    // Sort by distance (closest first)
    geoCandidates.sort((a, b) => a.distanceKm - b.distanceKm);

    // Take top pool for private screening verification
    const topPool = geoCandidates.slice(0, MAX_CANDIDATES_TO_RETURN * 2);

    // 5. Targeted private screening batch fetch (reads only required documents)
    const privateData = new Map<string, DonorPrivate>();
    if (topPool.length > 0) {
      try {
        const docRefs = topPool.map((c) => adminDb.collection('donorPrivate').doc(c.donor.uid));
        const privateSnaps = await adminDb.getAll(...docRefs);
        privateSnaps.forEach((snap) => {
          if (snap.exists) {
            privateData.set(snap.id, snap.data() as DonorPrivate);
          }
        });
      } catch (privErr) {
        console.warn('[match] Selective private fetch fallback:', privErr);
      }
    }

    // 6. Filter out any candidates with known medical screening flags
    const finalizedMatches = [];
    for (const item of topPool) {
      const priv = privateData.get(item.donor.uid);
      if (priv?.hasKnownScreeningFlags) {
        continue; // Disqualified based on self-reported screening flags
      }

      finalizedMatches.push(
        toMatchRecord({
          donor: item.donor,
          private: priv || null,
          distanceKm: item.distanceKm,
        })
      );

      if (finalizedMatches.length >= MAX_CANDIDATES_TO_RETURN) {
        break;
      }
    }

    // 7. Persist emergency request & candidates for real-time tracking
    // 7. Persist emergency request & candidates for real-time tracking
    const targetRequestId = (body.requestId && typeof body.requestId === 'string') 
      ? body.requestId 
      : `req_${Date.now()}`;

    try {
      const now = new Date().toISOString();
      const batch = adminDb.batch();
      const reqRef = adminDb.collection('emergencyRequests').doc(targetRequestId);

      batch.set(
        reqRef,
        {
          id: targetRequestId,
          rawMessage: body.rawMessage || '',
          extraction: {
            bloodGroup: recipientGroup,
            component: bloodComp,
            units: typeof body.units === 'number' ? body.units : null,
            hospital: body.hospital || null,
            city: body.city || null,
            urgency: body.urgency || 'urgent',
            rawSummary: body.rawSummary || 'Emergency blood coordination',
            missingFields: [],
            confidence: 1.0,
            patientInfo: null,
            contactInfo: null,
          },
          status: finalizedMatches.length > 0 ? 'contacting' : 'confirmed',
          requesterUid: null,
          hospitalLocation: { lat: hospitalLat, lng: hospitalLng },
          matchCount: finalizedMatches.length,
          contactedCount: 0,
          availableCount: 0,
          declinedCount: 0,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      );

      for (const match of finalizedMatches) {
        const matchRef = reqRef.collection('matches').doc(match.donorId);
        batch.set(matchRef, match, { merge: true });
      }

      await batch.commit();
    } catch (saveErr) {
      console.warn('[match] Non-fatal emergency request save error:', saveErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        requestId: targetRequestId,
        totalDonorsSearched: donors.length,
        matchCount: finalizedMatches.length,
        isProvisional: !component,
        matches: finalizedMatches,
      },
    });
  } catch (error: any) {
    console.error('[match] Error:', error);
    const errorMessage = error?.message || 'Internal server error during matching.';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
