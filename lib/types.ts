// ──────────────────────────────────────────────
// RaktMitra AI — Shared Type Definitions
// ──────────────────────────────────────────────

import { z } from 'zod';

// ── Blood Groups ──
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

// ── Urgency Levels ──
export const URGENCY_LEVELS = ['critical', 'urgent', 'standard'] as const;
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number];

// ── Blood Components ──
export const BLOOD_COMPONENTS = ['whole_blood', 'packed_rbc', 'platelets', 'plasma', 'cryoprecipitate'] as const;
export type BloodComponent = (typeof BLOOD_COMPONENTS)[number];

// ── Gemini Extraction Schema ──
export const extractionSchema = z.object({
  bloodGroup: z.enum(BLOOD_GROUPS).nullable(),
  component: z.enum(BLOOD_COMPONENTS).nullable(),
  units: z.number().int().positive().nullable(),
  hospital: z.string().nullable(),
  city: z.string().nullable(),
  urgency: z.enum(URGENCY_LEVELS).nullable(),
  patientInfo: z.string().nullable(),
  contactInfo: z.string().nullable(),
  rawSummary: z.string(),
  missingFields: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export type ExtractionResult = z.infer<typeof extractionSchema>;

// ── Donor Registration Schema ──
export const donorRegistrationSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  phone: z.string().regex(/^(\+91[\-\s]?)?[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian mobile number'),
  email: z.string().email('Invalid email address'),
  bloodGroup: z.enum(BLOOD_GROUPS),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format')
    .refine(
      (dob) => {
        const birthDate = new Date(dob);
        if (isNaN(birthDate.getTime())) return false;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age >= 18 && age <= 65;
      },
      { message: 'Donor must be between 18 and 65 years old to donate blood' }
    ),
  locality: z.string().min(2, 'Locality is required'),
  city: z.string().min(2, 'City is required'),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .nullable()
    .optional(),
  lastDonationDate: z.string().nullable().optional(),
  donationFrequency: z.enum(['first_time', 'occasional', 'regular']).optional().default('first_time'),
  isAvailable: z.boolean().optional().default(true),
  whatsappOptIn: z.literal(true, {
    errorMap: () => ({ message: 'WhatsApp opt-in is required' }),
  }),
  privacyConsent: z.literal(true, {
    errorMap: () => ({ message: 'Privacy consent is required' }),
  }),
  screeningDisclosures: z.array(z.string()).optional().default([]),
  medicalNotes: z.string().max(500).optional().default(''),
});

export type DonorRegistrationInput = z.infer<typeof donorRegistrationSchema>;

// ── Donor Registration ──
export interface DonorProfile {
  uid: string;
  fullName: string;
  phone: string;
  email: string;
  bloodGroup: BloodGroup;
  dateOfBirth: string;
  locality: string;
  city: string;
  location: {
    lat: number;
    lng: number;
  } | null;
  lastDonationDate: string | null;
  donationFrequency: 'first_time' | 'occasional' | 'regular';
  isAvailable: boolean;
  whatsappOptIn: boolean;
  privacyConsent: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Donor Private (restricted access) ──
export interface DonorPrivate {
  uid: string;
  screeningDisclosures: string[];
  medicalNotes: string;
  hasKnownScreeningFlags: boolean;
}

// ── Emergency Request ──
export type RequestStatus =
  | 'draft'
  | 'confirmed'
  | 'matching'
  | 'contacting'
  | 'in_progress'
  | 'fulfilled'
  | 'cancelled';

export interface EmergencyRequest {
  id: string;
  rawMessage: string;
  extraction: ExtractionResult;
  status: RequestStatus;
  requesterUid: string | null;
  hospitalLocation: {
    lat: number;
    lng: number;
  } | null;
  matchCount: number;
  contactedCount: number;
  availableCount: number;
  declinedCount: number;
  createdAt: string;
  updatedAt: string;
}

// ── Donor Match ──
export type MatchStatus = 'pending' | 'contacted' | 'available' | 'unavailable' | 'call_me' | 'no_response';

export interface DonorMatch {
  donorId: string;
  donorName: string;
  bloodGroup: BloodGroup;
  distanceKm: number;
  status: MatchStatus;
  whatsappSent: boolean;
  whatsappSentAt: string | null;
  respondedAt: string | null;
  notificationAttemptId: string | null;
}

// ── Notification ──
export interface NotificationAttempt {
  id: string;
  requestId: string;
  donorId: string;
  channel: 'whatsapp';
  templateName: string;
  recipientPhone: string;
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  waMessageId: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  failureReason: string | null;
}

// ── API Response wrapper ──
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ── Navigation ──
export type ViewKey = 'command' | 'register' | 'dashboard';
