import "server-only";

import { type App, cert, getApps, initializeApp } from "firebase-admin/app";
import { type Auth, getAuth } from "firebase-admin/auth";
import { type Firestore, getFirestore } from "firebase-admin/firestore";
import { type Storage, getStorage } from "firebase-admin/storage";

/*
 * Admin SDK — server-only (the `server-only` import above makes this module
 * throw if it's ever pulled into a client bundle).
 *
 * Local dev / emulators: no real credentials needed. When
 * NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true, we point the Admin SDK at the
 * emulators via the *_EMULATOR_HOST env vars it already knows how to read,
 * and initialize with just a projectId — the emulator doesn't check auth.
 *
 * Deployed environments (Vercel): real service account credentials, read
 * from FIREBASE_SERVICE_ACCOUNT_KEY (the service account JSON, as a single
 * env var) — never committed, set directly in the hosting platform's
 * secret store. See CLAUDE.md §3 and README.md for how to obtain one.
 */

const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

function buildApp(): App {
  if (useEmulator) {
    process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
    process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= "127.0.0.1:9199";
    return initializeApp({ projectId });
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set. For local dev, set " +
        "NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true instead and run the emulators.",
    );
  }
  const serviceAccount = JSON.parse(serviceAccountKey) as Record<string, string>;
  return initializeApp({ credential: cert(serviceAccount) });
}

const app: App = getApps()[0] ?? buildApp();

const adminAuth: Auth = getAuth(app);
const adminDb: Firestore = getFirestore(app);
const adminStorage: Storage = getStorage(app);

export { app, adminAuth, adminDb, adminStorage };
