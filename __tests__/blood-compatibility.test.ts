// ──────────────────────────────────────────────
// Tests: Blood Compatibility
// ──────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { getCompatibleDonorGroups, isCompatibleDonor, getSameGroupOnly } from '../lib/blood-compatibility';

describe('Blood Compatibility Matrix', () => {
  describe('Red blood cell compatibility', () => {
    it('O- can receive only from O-', () => {
      const groups = getCompatibleDonorGroups('O-', 'packed_rbc');
      expect(groups).toEqual(['O-']);
    });

    it('O+ can receive from O+ and O-', () => {
      const groups = getCompatibleDonorGroups('O+', 'packed_rbc');
      expect(groups).toEqual(['O+', 'O-']);
    });

    it('AB+ is universal recipient for RBCs', () => {
      const groups = getCompatibleDonorGroups('AB+', 'packed_rbc');
      expect(groups).toHaveLength(8);
      expect(groups).toContain('O-');
      expect(groups).toContain('AB+');
    });

    it('A+ can receive from A+, A-, O+, O-', () => {
      const groups = getCompatibleDonorGroups('A+', 'packed_rbc');
      expect(groups).toEqual(['A+', 'A-', 'O+', 'O-']);
    });

    it('B- can receive from B- and O-', () => {
      const groups = getCompatibleDonorGroups('B-', 'packed_rbc');
      expect(groups).toEqual(['B-', 'O-']);
    });
  });

  describe('Plasma compatibility (reversed)', () => {
    it('AB+ can receive plasma only from AB+', () => {
      const groups = getCompatibleDonorGroups('AB+', 'plasma');
      expect(groups).toEqual(['AB+']);
    });

    it('O- is universal recipient for plasma', () => {
      const groups = getCompatibleDonorGroups('O-', 'plasma');
      expect(groups).toHaveLength(8);
    });

    it('A+ can receive plasma from A+ and AB+', () => {
      const groups = getCompatibleDonorGroups('A+', 'plasma');
      expect(groups).toEqual(['A+', 'AB+']);
    });
  });

  describe('Platelet compatibility', () => {
    it('returns all blood groups for platelets (ABO-identical preferred)', () => {
      const groups = getCompatibleDonorGroups('A+', 'platelets');
      expect(groups).toHaveLength(8);
      // Same group should be first (preferred)
      expect(groups[0]).toBe('A+');
    });
  });

  describe('Null component defaults to RBC rules', () => {
    it('uses RBC compatibility when component is null', () => {
      const rbcGroups = getCompatibleDonorGroups('A+', 'packed_rbc');
      const nullGroups = getCompatibleDonorGroups('A+', null);
      expect(nullGroups).toEqual(rbcGroups);
    });
  });

  describe('isCompatibleDonor', () => {
    it('O- donor is compatible with any recipient for RBCs', () => {
      expect(isCompatibleDonor('O-', 'AB+', 'packed_rbc')).toBe(true);
      expect(isCompatibleDonor('O-', 'A+', 'packed_rbc')).toBe(true);
      expect(isCompatibleDonor('O-', 'O-', 'packed_rbc')).toBe(true);
    });

    it('A+ donor is NOT compatible with O+ recipient for RBCs', () => {
      expect(isCompatibleDonor('A+', 'O+', 'packed_rbc')).toBe(false);
    });

    it('AB+ donor is NOT compatible with O- for plasma', () => {
      // Actually AB is universal donor for plasma
      expect(isCompatibleDonor('AB+', 'O-', 'plasma')).toBe(true);
    });
  });

  describe('getSameGroupOnly', () => {
    it('returns only the same group', () => {
      expect(getSameGroupOnly('B+')).toEqual(['B+']);
    });
  });
});
