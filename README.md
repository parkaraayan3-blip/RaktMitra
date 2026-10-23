# RaktMitra AI — Frontend prototype

This is a responsive, dark-themed Next.js UI implementation of the RaktMitra AI command-center design direction.

## Run

```bash
npm install
npm run dev
```

Visit http://localhost:3000.

## Important scope

- UI screens: emergency command center, donor registration, and request dashboard.
- Emergency extraction uses a **very limited local demo parser**, NOT Gemini. It only recognizes a few sample terms.
- Registration validates locally but **does not save to Firebase**.
- No real donor search, notifications, WhatsApp dispatch, or response tracking are connected.
- The UI deliberately labels unavailable integrations and never fabricates donor data.

## Next integration milestones

1. Add Firebase Auth and secure Firestore donor registration with separate sensitive health records.
2. Add server-side Gemini extraction with Zod validation and human confirmation.
3. Add secure geospatial donor search and medically reviewed matching rules.
4. Add Meta WhatsApp Cloud API server-side dispatch to opted-in recipients and verified webhooks.
5. Add tests for authorization, matching, idempotency, and accessibility.

Never commit Meta/Gemini/Admin credentials to Git or expose them with NEXT_PUBLIC_ prefixes.
