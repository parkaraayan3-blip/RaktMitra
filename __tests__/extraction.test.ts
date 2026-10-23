// ──────────────────────────────────────────────
// Tests: Extraction Schema Validation
// ──────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { extractionSchema } from '../lib/types';

describe('Extraction Schema Validation', () => {
  it('validates a complete extraction result', () => {
    const validResult = {
      bloodGroup: 'O-',
      component: 'packed_rbc',
      units: 2,
      hospital: 'Ruby Hall',
      city: 'Pune',
      urgency: 'urgent',
      patientInfo: 'Adult male patient',
      contactInfo: '+91 98765 43210',
      rawSummary: 'Emergency request for 2 units of O- packed RBCs at Ruby Hall, Pune.',
      missingFields: [],
      confidence: 0.95,
    };

    const result = extractionSchema.safeParse(validResult);
    expect(result.success).toBe(true);
  });

  it('validates result with null fields', () => {
    const partialResult = {
      bloodGroup: 'O-',
      component: null,
      units: null,
      hospital: null,
      city: 'Pune',
      urgency: null,
      patientInfo: null,
      contactInfo: null,
      rawSummary: 'Partial extraction with missing details.',
      missingFields: ['component', 'units', 'hospital', 'urgency'],
      confidence: 0.6,
    };

    const result = extractionSchema.safeParse(partialResult);
    expect(result.success).toBe(true);
  });

  it('rejects invalid blood group', () => {
    const invalid = {
      bloodGroup: 'X+',
      component: null,
      units: 1,
      hospital: null,
      city: null,
      urgency: null,
      patientInfo: null,
      contactInfo: null,
      rawSummary: 'Invalid blood group.',
      missingFields: [],
      confidence: 0.5,
    };

    const result = extractionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects invalid blood component', () => {
    const invalid = {
      bloodGroup: 'A+',
      component: 'unicorn_blood',
      units: 1,
      hospital: null,
      city: null,
      urgency: null,
      patientInfo: null,
      contactInfo: null,
      rawSummary: 'Invalid component.',
      missingFields: [],
      confidence: 0.5,
    };

    const result = extractionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects negative units', () => {
    const invalid = {
      bloodGroup: 'A+',
      component: null,
      units: -2,
      hospital: null,
      city: null,
      urgency: null,
      patientInfo: null,
      contactInfo: null,
      rawSummary: 'Negative units.',
      missingFields: [],
      confidence: 0.5,
    };

    const result = extractionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects confidence outside 0-1 range', () => {
    const invalid = {
      bloodGroup: 'A+',
      component: null,
      units: 1,
      hospital: null,
      city: null,
      urgency: null,
      patientInfo: null,
      contactInfo: null,
      rawSummary: 'Bad confidence.',
      missingFields: [],
      confidence: 1.5,
    };

    const result = extractionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields (rawSummary, missingFields, confidence)', () => {
    const incomplete = {
      bloodGroup: 'A+',
      component: null,
      units: 1,
    };

    const result = extractionSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it('validates all valid blood groups', () => {
    const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    for (const bg of groups) {
      const data = {
        bloodGroup: bg,
        component: null,
        units: null,
        hospital: null,
        city: null,
        urgency: null,
        patientInfo: null,
        contactInfo: null,
        rawSummary: `Test for ${bg}`,
        missingFields: [],
        confidence: 0.9,
      };
      const result = extractionSchema.safeParse(data);
      expect(result.success).toBe(true);
    }
  });

  it('validates all valid components', () => {
    const components = ['whole_blood', 'packed_rbc', 'platelets', 'plasma', 'cryoprecipitate'];
    for (const comp of components) {
      const data = {
        bloodGroup: 'A+',
        component: comp,
        units: 1,
        hospital: null,
        city: null,
        urgency: null,
        patientInfo: null,
        contactInfo: null,
        rawSummary: `Test for ${comp}`,
        missingFields: [],
        confidence: 0.9,
      };
      const result = extractionSchema.safeParse(data);
      expect(result.success).toBe(true);
    }
  });

  it('validates all urgency levels', () => {
    const levels = ['critical', 'urgent', 'standard'];
    for (const level of levels) {
      const data = {
        bloodGroup: 'O+',
        component: null,
        units: null,
        hospital: null,
        city: null,
        urgency: level,
        patientInfo: null,
        contactInfo: null,
        rawSummary: `Test urgency ${level}`,
        missingFields: [],
        confidence: 0.8,
      };
      const result = extractionSchema.safeParse(data);
      expect(result.success).toBe(true);
    }
  });
});
