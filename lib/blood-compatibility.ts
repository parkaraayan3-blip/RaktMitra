// ──────────────────────────────────────────────
// Blood Group Compatibility Matrix
// ──────────────────────────────────────────────
// These rules are for VOLUNTEER DISCOVERY only.
// Final compatibility MUST be confirmed by medical professionals.
//
// Rules differ by component:
// - Red cells: standard ABO/Rh compatibility
// - Platelets: ABO-identical preferred, but any-group acceptable in emergencies
// - Plasma: reversed ABO compatibility (AB is universal donor)
//
// Reference: AABB Technical Manual, 20th Edition

import type { BloodGroup, BloodComponent } from './types';

/**
 * Red blood cell compatibility.
 * Maps recipient blood group → compatible donor groups (ordered by preference).
 */
const RBC_COMPATIBILITY: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-'],
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
};

/**
 * Plasma compatibility (reversed from red cells).
 * AB plasma is universal donor.
 */
const PLASMA_COMPATIBILITY: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

/**
 * Platelet compatibility.
 * ABO-identical is preferred. In practice, any group can be used
 * but we still filter for best matches.
 */
const PLATELET_COMPATIBILITY: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
  'A-': ['A-', 'A+', 'O-', 'O+', 'AB-', 'AB+', 'B-', 'B+'],
  'A+': ['A+', 'A-', 'O+', 'O-', 'AB+', 'AB-', 'B+', 'B-'],
  'B-': ['B-', 'B+', 'O-', 'O+', 'AB-', 'AB+', 'A-', 'A+'],
  'B+': ['B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'A+', 'A-'],
  'AB-': ['AB-', 'AB+', 'A-', 'A+', 'B-', 'B+', 'O-', 'O+'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
};

/**
 * Returns the list of compatible donor blood groups for a given recipient and component.
 *
 * @param recipientGroup - The blood group of the patient
 * @param component - The blood component needed (defaults to packed_rbc for conservative matching)
 * @returns Array of compatible donor blood groups, ordered by preference
 */
export function getCompatibleDonorGroups(
  recipientGroup: BloodGroup,
  component: BloodComponent | null
): BloodGroup[] {
  switch (component) {
    case 'plasma':
      return PLASMA_COMPATIBILITY[recipientGroup];
    case 'platelets':
      return PLATELET_COMPATIBILITY[recipientGroup];
    case 'whole_blood':
    case 'packed_rbc':
    case 'cryoprecipitate':
    case null:
    default:
      // Conservative: use red cell rules when component unknown
      return RBC_COMPATIBILITY[recipientGroup];
  }
}

/**
 * Checks if a specific donor blood group is compatible for a recipient.
 */
export function isCompatibleDonor(
  donorGroup: BloodGroup,
  recipientGroup: BloodGroup,
  component: BloodComponent | null
): boolean {
  return getCompatibleDonorGroups(recipientGroup, component).includes(donorGroup);
}

/**
 * Returns same-group only (most conservative discovery).
 * Used when component is unspecified and labeled as provisional.
 */
export function getSameGroupOnly(group: BloodGroup): BloodGroup[] {
  return [group];
}
