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

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    console.warn(
      '[firebase-admin] FIREBASE_SERVICE_ACCOUNT_KEY not set. Admin SDK will not be available.'
    );
    // Initialize without credentials for dev — will fail on actual Firestore calls
    return initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey) as ServiceAccount;
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } catch (e) {
    console.error('[firebase-admin] Failed to parse service account key:', e);
    return initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
  }
}

const adminApp = getAdminApp();

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
export default adminApp;
