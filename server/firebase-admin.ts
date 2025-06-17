import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Firebase Admin service account configuration from environment variables
if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
  throw new Error('Missing required Firebase Admin environment variables: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL');
}

const serviceAccount: ServiceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL
};

// Initialize Firebase Admin (only if not already initialized)
let adminApp;
if (getApps().length === 0) {
  adminApp = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.projectId,
  });
  console.log('Firebase Admin SDK initialized successfully');
} else {
  adminApp = getApps()[0];
  console.log('Firebase Admin SDK already initialized');
}

// Export the auth instance
export const adminAuth = getAuth(adminApp);

// Helper function to create a new Firebase user
export async function createFirebaseUser(email: string, password: string, displayName?: string) {
  try {
    console.log(`Creating Firebase user for email: ${email}`);
    
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
      emailVerified: true, // Auto-verify invited users
    });
    
    console.log(`Firebase user created successfully: ${userRecord.uid}`);
    return userRecord;
  } catch (error: any) {
    console.error('Error creating Firebase user:', error);
    
    // Handle common errors
    if (error.code === 'auth/email-already-exists') {
      throw new Error('A user with this email already exists in Firebase');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak');
    }
    
    throw new Error(`Failed to create Firebase user: ${error.message}`);
  }
}

// Helper function to delete a Firebase user (for cleanup if database creation fails)
export async function deleteFirebaseUser(uid: string) {
  try {
    await adminAuth.deleteUser(uid);
    console.log(`Firebase user deleted: ${uid}`);
  } catch (error) {
    console.error(`Error deleting Firebase user ${uid}:`, error);
  }
}

// Helper function to update Firebase user
export async function updateFirebaseUser(uid: string, updates: { email?: string; displayName?: string; password?: string }) {
  try {
    await adminAuth.updateUser(uid, updates);
    console.log(`Firebase user updated: ${uid}`);
  } catch (error) {
    console.error(`Error updating Firebase user ${uid}:`, error);
    throw error;
  }
}