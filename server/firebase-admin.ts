// server/firebase-admin.ts
import admin from "firebase-admin";

if (!admin.apps.length) {
  // In Cloud Functions/Hosting, default creds are available automatically.
  // Locally, if you ever need admin, set GOOGLE_APPLICATION_CREDENTIALS to a key file path (dev-only).
  admin.initializeApp({});
}

export const adminApp = admin.app();
export const auth = admin.auth();
export const db = admin.firestore();

export async function createFirebaseUser(
  email: string,
  password: string,
  displayName: string
): Promise<admin.auth.UserRecord> {
  return auth.createUser({ email, password, displayName });
}

export async function deleteFirebaseUser(uid: string): Promise<void> {
  await auth.deleteUser(uid);
}
