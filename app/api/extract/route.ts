// ──────────────────────────────────────────────
// API Route: /api/extract
// ──────────────────────────────────────────────
// Accepts a raw emergency message and returns structured extraction via Gemini.
// High-efficiency & resilient implementation:
// 1. Sliding window rate limiting to protect API quota.
// 2. In-memory response caching for duplicate messages.
// 3. Fallback cascade across Gemini model versions.
// 4. Strict Zod schema validation.

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, type GenerateContentResult } from '@google/generative-ai';
import { extractionSchema } from '@/lib/types';
import { checkRateLimit } from '@/lib/rate-limit';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// In-memory cache for emergency extractions (TTL 5 minutes)
interface CacheEntry {
  data: any;
  expiresAt: number;
}
const extractionCache = new Map<string, CacheEntry>();

const SYSTEM_PROMPT = `You are RaktMitra AI, an emergency blood request parsing system used in India.

Your job is to extract structured information from unstructured emergency blood requests.
These messages may be in English, Hindi, Hinglish (mixed), or have abbreviations and typos.

RULES:
1. Extract ONLY what is explicitly stated or strongly implied. Never invent information.
2. If a field cannot be determined from the message, set it to null.
3. List all fields that are missing or ambiguous in "missingFields".
4. Blood groups: Use standard ABO/Rh notation: A+, A-, B+, B-, AB+, AB-, O+, O-
5. Components: Use one of: whole_blood, packed_rbc, platelets, plasma, cryoprecipitate — or null if unspecified.
6. Urgency: Map to "critical" (life-threatening, immediate), "urgent" (today/tonight/ASAP), or "standard" (planned, tomorrow, upcoming).
7. If the message is not a blood emergency request at all, set confidence to 0 and explain in rawSummary.
8. Provide a brief human-readable summary in rawSummary.

You MUST respond with valid JSON matching this exact schema:
{
  "bloodGroup": "<blood group or null>",
  "component": "<component or null>",
  "units": <number or null>,
  "hospital": "<hospital name or null>",
  "city": "<city or null>",
  "urgency": "<critical|urgent|standard or null>",
  "patientInfo": "<any patient details mentioned or null>",
  "contactInfo": "<any contact info mentioned or null>",
  "rawSummary": "<brief human-readable summary>",
  "missingFields": ["<list of missing/ambiguous fields>"],
  "confidence": <0.0 to 1.0>
}`;

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const rateCheck = checkRateLimit(`extract_${clientIp}`, 15, 60 * 1000);
    if (!rateCheck.success) {
      return NextResponse.json(
        { success: false, error: 'Extraction rate limit exceeded. Please wait a moment.' },
        { status: 429 }
      );
    }

    // 2. Validate API key
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key not configured. Set GEMINI_API_KEY in environment variables.' },
        { status: 503 }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const rawMessage = body?.message;

    if (!rawMessage || typeof rawMessage !== 'string' || rawMessage.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Request body must include a non-empty "message" string.' },
        { status: 400 }
      );
    }

    const trimmedMessage = rawMessage.trim();
    if (trimmedMessage.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Message too long. Maximum 2000 characters.' },
        { status: 400 }
      );
    }

    // 4. Cache check (avoids redundant Gemini calls for identical messages)
    const cacheKey = trimmedMessage.toLowerCase();
    const cached = extractionCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true,
      });
    }

    // 5. Call Gemini with fallback cascade
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const candidateModels = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];

    let result: GenerateContentResult | null = null;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            maxOutputTokens: 1024,
          },
        });
        result = await model.generateContent([
          { text: SYSTEM_PROMPT },
          { text: `Emergency message to parse:\n\n"${trimmedMessage}"` },
        ]);
        if (result) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`[extract] Model ${modelName} failed, attempting next candidate:`, err?.message || err);
      }
    }

    if (!result) {
      throw lastError || new Error('All Gemini model fallbacks failed.');
    }

    const responseText = result.response.text();

    // 6. Parse and validate with Zod
    let parsed: unknown;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Gemini returned invalid JSON. Please try again.' },
        { status: 502 }
      );
    }

    const validation = extractionSchema.safeParse(parsed);

    if (!validation.success) {
      console.error('[extract] Zod validation failed:', validation.error.issues);
      return NextResponse.json(
        {
          success: false,
          error: 'Extraction output failed schema validation.',
          details: validation.error.issues,
        },
        { status: 502 }
      );
    }

    // Cache valid result for 5 minutes
    extractionCache.set(cacheKey, {
      data: validation.data,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return NextResponse.json({
      success: true,
      data: validation.data,
    });
  } catch (error: any) {
    console.error('[extract] Error:', error);
    const errorMessage = error?.message || 'Internal server error during extraction.';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
