// ──────────────────────────────────────────────
// Firebase Admin SDK — Server-side only
// ──────────────────────────────────────────────
// This file must NEVER be imported from client components.
// It uses the FIREBASE_SERVICE_ACCOUNT_KEY env variable.

import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function getAdminApp() {
  if (getApps().length) {
    return getApps()[0];
  }

  let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  // Auto-detect local service account key file in root directory during development
  if (!serviceAccountKey) {
    try {
      const fs = require('fs');
      const path = require('path');
      const files = fs.readdirSync(process.cwd());
      const keyFile = files.find((f: string) => f.includes('firebase-adminsdk') && f.endsWith('.json'));
      if (keyFile) {
        serviceAccountKey = fs.readFileSync(path.join(process.cwd(), keyFile), 'utf8');
      }
    } catch {
      // Ignore filesystem read errors in serverless environments
    }
  }

  if (!serviceAccountKey) {
    console.warn(
      '[firebase-admin] FIREBASE_SERVICE_ACCOUNT_KEY not set and no local key file found. Admin SDK will not be available.'
    );
    // Initialize without credentials for dev — will fail on actual Firestore calls
    return initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'raktmitra-1c5ea' });
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey) as ServiceAccount;
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'raktmitra-1c5ea',
    });
  } catch (e) {
    console.error('[firebase-admin] Failed to parse service account key:', e);
    return initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'raktmitra-1c5ea' });
  }
}

const adminApp = getAdminApp();

export const adminDb = getFirestore(adminApp);
try {
  adminDb.settings({ ignoreUndefinedProperties: true });
} catch {
  // Settings already locked
}
export const adminAuth = getAuth(adminApp);
export default adminApp;
