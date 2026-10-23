// ──────────────────────────────────────────────
// Tests: Donor Matching Engine
// ──────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { matchDonors, isDonationCooldownPassed, toMatchRecord } from '../lib/matching';
import type { DonorProfile, DonorPrivate } from '../lib/types';

// Helper to create a test donor
function makeDonor(overrides: Partial<DonorProfile> = {}): DonorProfile {
  return {
    uid: `donor_${Math.random().toString(36).slice(2, 8)}`,
    fullName: 'Test Donor',
    phone: '+919999999999',
    email: 'test@example.com',
    bloodGroup: 'O+',
    dateOfBirth: '1990-01-01',
    locality: 'Shivajinagar',
    city: 'Pune',
    location: { lat: 18.5308, lng: 73.8475 }, // Near Ruby Hall, Pune
    lastDonationDate: null,
    donationFrequency: 'regular',
    isAvailable: true,
    whatsappOptIn: true,
    privacyConsent: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Donor Matching Engine', () => {
  const baseQuery = {
    recipientBloodGroup: 'O+' as const,
    component: null,
    hospitalLat: 18.5308,
    hospitalLng: 73.8475,
  };

  describe('Blood group filtering', () => {
    it('matches compatible blood groups', () => {
      const donors = [
        makeDonor({ uid: 'd1', bloodGroup: 'O+' }),
        makeDonor({ uid: 'd2', bloodGroup: 'O-' }),
        makeDonor({ uid: 'd3', bloodGroup: 'A+' }), // Incompatible for O+ recipient
      ];

      const results = matchDonors(baseQuery, donors, new Map());
      const matchedGroups = results.map((r) => r.donor.bloodGroup);

      expect(matchedGroups).toContain('O+');
      expect(matchedGroups).toContain('O-');
      expect(matchedGroups).not.toContain('A+');
    });
  });

  describe('Availability filtering', () => {
    it('excludes unavailable donors', () => {
      const donors = [
        makeDonor({ uid: 'd1', isAvailable: true }),
        makeDonor({ uid: 'd2', isAvailable: false }),
      ];

      const results = matchDonors(baseQuery, donors, new Map());
      expect(results).toHaveLength(1);
      expect(results[0].donor.uid).toBe('d1');
    });

    it('excludes donors without WhatsApp opt-in', () => {
      const donors = [
        makeDonor({ uid: 'd1', whatsappOptIn: true }),
        makeDonor({ uid: 'd2', whatsappOptIn: false }),
      ];

      const results = matchDonors(baseQuery, donors, new Map());
      expect(results).toHaveLength(1);
    });
  });

  describe('Screening flag filtering', () => {
    it('excludes donors with known screening flags', () => {
      const donors = [
        makeDonor({ uid: 'd1' }),
        makeDonor({ uid: 'd2' }),
      ];

      const privateData = new Map<string, DonorPrivate>();
      privateData.set('d2', {
        uid: 'd2',
        screeningDisclosures: ['Recent surgery'],
        medicalNotes: '',
        hasKnownScreeningFlags: true,
      });

      const results = matchDonors(baseQuery, donors, privateData);
      expect(results).toHaveLength(1);
      expect(results[0].donor.uid).toBe('d1');
    });
  });

  describe('Donation cooldown', () => {
    it('excludes donors who donated recently (within 56 days)', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30); // 30 days ago

      const donors = [
        makeDonor({ uid: 'd1', lastDonationDate: null }), // Never donated
        makeDonor({ uid: 'd2', lastDonationDate: recentDate.toISOString() }), // Too recent
      ];

      const results = matchDonors(baseQuery, donors, new Map());
      expect(results).toHaveLength(1);
      expect(results[0].donor.uid).toBe('d1');
    });

    it('includes donors who donated long ago', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days ago

      const donors = [makeDonor({ uid: 'd1', lastDonationDate: oldDate.toISOString() })];

      const results = matchDonors(baseQuery, donors, new Map());
      expect(results).toHaveLength(1);
    });
  });

  describe('Geographic filtering', () => {
    it('excludes donors outside search radius', () => {
      const donors = [
        makeDonor({ uid: 'd1', location: { lat: 18.5308, lng: 73.8475 } }), // Same location
        makeDonor({ uid: 'd2', location: { lat: 19.076, lng: 72.8777 } }), // Mumbai (~120km)
      ];

      const results = matchDonors({ ...baseQuery, searchRadiusKm: 50 }, donors, new Map());
      expect(results).toHaveLength(1);
      expect(results[0].donor.uid).toBe('d1');
    });

    it('excludes donors without location', () => {
      const donors = [
        makeDonor({ uid: 'd1', location: { lat: 18.5308, lng: 73.8475 } }),
        makeDonor({ uid: 'd2', location: null }),
      ];

      const results = matchDonors(baseQuery, donors, new Map());
      expect(results).toHaveLength(1);
    });

    it('sorts results by distance (closest first)', () => {
      const donors = [
        makeDonor({ uid: 'far', location: { lat: 18.6, lng: 73.9 } }),
        makeDonor({ uid: 'close', location: { lat: 18.531, lng: 73.848 } }),
        makeDonor({ uid: 'mid', location: { lat: 18.55, lng: 73.86 } }),
      ];

      const results = matchDonors(baseQuery, donors, new Map());
      expect(results[0].donor.uid).toBe('close');
      expect(results[0].distanceKm).toBeLessThan(results[1].distanceKm);
      expect(results[1].distanceKm).toBeLessThan(results[2].distanceKm);
    });
  });

  describe('Result capping', () => {
    it('returns at most 20 results', () => {
      const donors = Array.from({ length: 30 }, (_, i) =>
        makeDonor({
          uid: `d${i}`,
          location: { lat: 18.53 + i * 0.001, lng: 73.85 },
        })
      );

      const results = matchDonors(baseQuery, donors, new Map());
      expect(results.length).toBeLessThanOrEqual(20);
    });
  });
});

describe('isDonationCooldownPassed', () => {
  it('returns true when no previous donation', () => {
    expect(isDonationCooldownPassed(null)).toBe(true);
  });

  it('returns false for recent donation', () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 10);
    expect(isDonationCooldownPassed(recent.toISOString())).toBe(false);
  });

  it('returns true for old donation', () => {
    const old = new Date();
    old.setDate(old.getDate() - 60);
    expect(isDonationCooldownPassed(old.toISOString())).toBe(true);
  });
});

describe('toMatchRecord', () => {
  it('converts candidate to match record without private data', () => {
    const candidate = {
      donor: makeDonor({ uid: 'd1', fullName: 'John Doe', bloodGroup: 'O+' }),
      private: { uid: 'd1', screeningDisclosures: ['test'], medicalNotes: 'secret', hasKnownScreeningFlags: false },
      distanceKm: 5.42,
    };

    const record = toMatchRecord(candidate);

    expect(record.donorId).toBe('d1');
    expect(record.donorName).toBe('John Doe');
    expect(record.bloodGroup).toBe('O+');
    expect(record.distanceKm).toBe(5.42);
    expect(record.status).toBe('pending');
    expect(record.whatsappSent).toBe(false);
    // Ensure no private data leaks
    expect(record).not.toHaveProperty('private');
    expect(record).not.toHaveProperty('screeningDisclosures');
    expect(record).not.toHaveProperty('medicalNotes');
  });
});
