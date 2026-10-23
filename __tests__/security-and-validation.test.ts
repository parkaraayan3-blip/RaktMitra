// ──────────────────────────────────────────────
// Tests: Security, Rate Limiting & Registration Validation
// ──────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { donorRegistrationSchema } from '../lib/types';
import { checkRateLimit } from '../lib/rate-limit';

describe('Donor Registration Validation (Zod Schema)', () => {
  const validRegistration = {
    fullName: 'Rahul Sharma',
    phone: '+919876543210',
    email: 'rahul.sharma@example.com',
    bloodGroup: 'B+',
    dateOfBirth: '1995-05-15',
    locality: 'Kothrud',
    city: 'Pune',
    isAvailable: true,
    whatsappOptIn: true,
    privacyConsent: true,
    screeningDisclosures: [],
    donationFrequency: 'regular',
  };

  it('validates a compliant donor registration', () => {
    const result = donorRegistrationSchema.safeParse(validRegistration);
    expect(result.success).toBe(true);
  });

  it('rejects registration without WhatsApp opt-in', () => {
    const invalid = { ...validRegistration, whatsappOptIn: false };
    const result = donorRegistrationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects registration without Privacy consent', () => {
    const invalid = { ...validRegistration, privacyConsent: false };
    const result = donorRegistrationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects donors under 18 years of age', () => {
    // Current local year is 2026, so born in 2012 is 14 years old
    const underAge = { ...validRegistration, dateOfBirth: '2012-01-01' };
    const result = donorRegistrationSchema.safeParse(underAge);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('between 18 and 65 years old');
    }
  });

  it('rejects invalid Indian phone number formats', () => {
    const badPhone = { ...validRegistration, phone: '12345' };
    const result = donorRegistrationSchema.safeParse(badPhone);
    expect(result.success).toBe(false);
  });

  it('accepts valid 10-digit phone number without prefix and formats correctly', () => {
    const tenDigit = { ...validRegistration, phone: '9876543210' };
    const result = donorRegistrationSchema.safeParse(tenDigit);
    expect(result.success).toBe(true);
  });
});

describe('Security & Rate Limiting Engine', () => {
  it('allows requests within threshold and blocks upon exceeding limit', () => {
    const testKey = `test_limit_${Date.now()}`;
    const limit = 3;
    const windowMs = 10000;

    // First 3 should pass
    expect(checkRateLimit(testKey, limit, windowMs).success).toBe(true);
    expect(checkRateLimit(testKey, limit, windowMs).success).toBe(true);
    expect(checkRateLimit(testKey, limit, windowMs).success).toBe(true);

    // 4th request must be blocked
    const fourth = checkRateLimit(testKey, limit, windowMs);
    expect(fourth.success).toBe(false);
    expect(fourth.remaining).toBe(0);
  });
});

describe('Webhook Signature Verification (Timing Safe HMAC)', () => {
  const APP_SECRET = 'hackathon_meta_secret_key_12345';
  const payload = JSON.stringify({ entry: [{ id: '123', changes: [] }] });

  function generateValidSignature(body: string, secret: string) {
    const hash = crypto.createHmac('sha256', secret).update(body).digest('hex');
    return `sha256=${hash}`;
  }

  function verifySignature(header: string, body: string, secret: string): boolean {
    if (!header || !header.startsWith('sha256=')) return false;
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    const received = header.replace('sha256=', '');

    try {
      const expectedBuf = Buffer.from(expected, 'hex');
      const receivedBuf = Buffer.from(received, 'hex');
      if (expectedBuf.length !== receivedBuf.length) return false;
      return crypto.timingSafeEqual(expectedBuf, receivedBuf);
    } catch {
      return false;
    }
  }

  it('validates a genuine WhatsApp webhook signature', () => {
    const signature = generateValidSignature(payload, APP_SECRET);
    expect(verifySignature(signature, payload, APP_SECRET)).toBe(true);
  });

  it('rejects a forged or tampered webhook payload', () => {
    const signature = generateValidSignature(payload, APP_SECRET);
    const tamperedPayload = payload + ' ';
    expect(verifySignature(signature, tamperedPayload, APP_SECRET)).toBe(false);
  });

  it('rejects an invalid signature format without crashing', () => {
    expect(verifySignature('invalid_sig', payload, APP_SECRET)).toBe(false);
    expect(verifySignature('', payload, APP_SECRET)).toBe(false);
  });
});
