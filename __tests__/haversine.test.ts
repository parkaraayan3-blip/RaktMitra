// ──────────────────────────────────────────────
// Tests: Haversine Distance
// ──────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { haversineDistance, isWithinRadius } from '../lib/haversine';

describe('Haversine Distance', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistance(18.5204, 73.8567, 18.5204, 73.8567)).toBe(0);
  });

  it('calculates distance between Pune and Mumbai (~150 km)', () => {
    // Pune: 18.5204, 73.8567
    // Mumbai: 19.0760, 72.8777
    const distance = haversineDistance(18.5204, 73.8567, 19.076, 72.8777);
    expect(distance).toBeGreaterThan(115);
    expect(distance).toBeLessThan(135);
  });

  it('calculates distance between Delhi and Agra (~200 km)', () => {
    const distance = haversineDistance(28.6139, 77.209, 27.1767, 78.0081);
    expect(distance).toBeGreaterThan(170);
    expect(distance).toBeLessThan(210);
  });

  it('calculates short distance within a city (~5 km)', () => {
    // Ruby Hall Clinic, Pune to Pune Station
    const distance = haversineDistance(18.5308, 73.8475, 18.5285, 73.8743);
    expect(distance).toBeLessThan(5);
    expect(distance).toBeGreaterThan(1);
  });

  it('handles antipodal points (~20000 km)', () => {
    const distance = haversineDistance(0, 0, 0, 180);
    expect(distance).toBeGreaterThan(20000);
    expect(distance).toBeLessThan(20100);
  });
});

describe('isWithinRadius', () => {
  it('returns true when within radius', () => {
    expect(isWithinRadius(18.5204, 73.8567, 18.5308, 73.8475, 5)).toBe(true);
  });

  it('returns false when outside radius', () => {
    // Pune to Mumbai is ~120km, should be outside 50km radius
    expect(isWithinRadius(18.5204, 73.8567, 19.076, 72.8777, 50)).toBe(false);
  });

  it('returns true when exactly at radius boundary', () => {
    const dist = haversineDistance(18.5204, 73.8567, 19.076, 72.8777);
    expect(isWithinRadius(18.5204, 73.8567, 19.076, 72.8777, dist)).toBe(true);
  });
});
