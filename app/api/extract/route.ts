// ──────────────────────────────────────────────
// API Route: /api/extract
// ──────────────────────────────────────────────
// Accepts a raw emergency message and returns structured extraction via Gemini.
// Validates output with Zod schema before returning.

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, type GenerateContentResult } from '@google/generative-ai';
import { extractionSchema, type ExtractionResult } from '@/lib/types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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
    // Validate API key
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key not configured. Set GEMINI_API_KEY in environment variables.' },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await request.json();
    const rawMessage = body?.message;

    if (!rawMessage || typeof rawMessage !== 'string' || rawMessage.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Request body must include a non-empty "message" string.' },
        { status: 400 }
      );
    }

    if (rawMessage.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Message too long. Maximum 2000 characters.' },
        { status: 400 }
      );
    }

    // Call Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1, // Low temperature for consistent extraction
      },
    });

    const result: GenerateContentResult = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: `Emergency message to parse:\n\n"${rawMessage}"` },
    ]);

    const responseText = result.response.text();

    // Parse and validate with Zod
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

    return NextResponse.json({
      success: true,
      data: validation.data,
    });
  } catch (error) {
    console.error('[extract] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during extraction.' },
      { status: 500 }
    );
  }
}
