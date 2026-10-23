// ──────────────────────────────────────────────
// Donor Matching Engine
// ──────────────────────────────────────────────
// Deterministic server-side matching.
// Filters by: blood group compatibility, availability, consent,
//             screening flags, proximity, and donation cooldown.
//
// This is a VOLUNTEER DISCOVERY tool. Matched donors are potential
// candidates requiring professional blood bank screening.

import type { BloodGroup, BloodComponent, DonorProfile, DonorPrivate, DonorMatch } from './types';
import { getCompatibleDonorGroups } from './blood-compatibility';
import { haversineDistance } from './haversine';

/** Minimum days between whole blood donations (56 days / ~8 weeks). */
const MIN_DONATION_INTERVAL_DAYS = 56;

/** Default search radius in km. */
const DEFAULT_SEARCH_RADIUS_KM = 50;

/** Maximum donors to return per request. */
const MAX_MATCH_RESULTS = 20;

export interface MatchQuery {
  recipientBloodGroup: BloodGroup;
  component: BloodComponent | null;
  hospitalLat: number;
  hospitalLng: number;
  searchRadiusKm?: number;
}

export interface MatchCandidate {
  donor: DonorProfile;
  private: DonorPrivate | null;
  distanceKm: number;
}

/**
 * Checks if a donor has passed the minimum donation cooldown period.
 */
export function isDonationCooldownPassed(lastDonationDate: string | null): boolean {
  if (!lastDonationDate) return true; // Never donated, eligible
  const lastDate = new Date(lastDonationDate);
  const now = new Date();
  const diffMs = now.getTime() - lastDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= MIN_DONATION_INTERVAL_DAYS;
}

/**
 * Runs the deterministic matching pipeline.
 *
 * Steps:
 * 1. Filter by blood group compatibility
 * 2. Filter by availability and consent
 * 3. Filter by screening flags
 * 4. Filter by donation cooldown
 * 5. Filter by geographic proximity
 * 6. Sort by distance (closest first)
 * 7. Cap results
 */
export function matchDonors(
  query: MatchQuery,
  donors: DonorProfile[],
  privateData: Map<string, DonorPrivate>
): MatchCandidate[] {
  const compatibleGroups = getCompatibleDonorGroups(
    query.recipientBloodGroup,
    query.component
  );
  const searchRadius = query.searchRadiusKm ?? DEFAULT_SEARCH_RADIUS_KM;

  const candidates: MatchCandidate[] = [];

  for (const donor of donors) {
    // Step 1: Blood group compatibility
    if (!compatibleGroups.includes(donor.bloodGroup)) continue;

    // Step 2: Availability and consent
    if (!donor.isAvailable) continue;
    if (!donor.whatsappOptIn) continue;

    // Step 3: Screening flags
    const donorPrivate = privateData.get(donor.uid) ?? null;
    if (donorPrivate?.hasKnownScreeningFlags) continue;

    // Step 4: Donation cooldown
    if (!isDonationCooldownPassed(donor.lastDonationDate)) continue;

    // Step 5: Geographic proximity
    if (!donor.location) continue;
    const distanceKm = haversineDistance(
      query.hospitalLat,
      query.hospitalLng,
      donor.location.lat,
      donor.location.lng
    );
    if (distanceKm > searchRadius) continue;

    candidates.push({
      donor,
      private: donorPrivate,
      distanceKm,
    });
  }

  // Step 6: Sort by distance
  candidates.sort((a, b) => a.distanceKm - b.distanceKm);

  // Step 7: Cap results
  return candidates.slice(0, MAX_MATCH_RESULTS);
}

/**
 * Converts a MatchCandidate to a DonorMatch record for storage/display.
 * Strips private information for non-coordinator views.
 */
export function toMatchRecord(candidate: MatchCandidate): DonorMatch {
  return {
    donorId: candidate.donor.uid,
    donorName: candidate.donor.fullName,
    bloodGroup: candidate.donor.bloodGroup,
    distanceKm: candidate.distanceKm,
    status: 'pending',
    whatsappSent: false,
    whatsappSentAt: null,
    respondedAt: null,
    notificationAttemptId: null,
  };
}
