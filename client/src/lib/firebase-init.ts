// Import Firebase with explicit module registration
import { initializeApp, getApps, FirebaseApp } from "firebase/app";

// Import auth with all necessary functions to ensure module registration
import { 
  getAuth, 
  Auth, 
  GoogleAuthProvider,
  signInWithCredential,
  onAuthStateChanged,
  signOut
} from "firebase/auth";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Global Firebase instances
let app: FirebaseApp | null = null;
let auth: Auth | null = null;

// Initialize Firebase with delayed auth initialization
const initializeFirebaseApp = () => {
  if (typeof window === 'undefined') return null;
  
  // Validate required Firebase configuration
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    console.error('Firebase configuration incomplete. Required environment variables: VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID');
    return null;
  }
  
  try {
    console.log('Initializing Firebase app...');
    const existingApps = getApps();
    
    if (existingApps.length > 0) {
      console.log('Using existing Firebase app');
      return existingApps[0];
    }
    
    console.log('Creating new Firebase app');
    return initializeApp(firebaseConfig);
  } catch (error) {
    console.error('Firebase app initialization failed:', error);
    return null;
  }
};

// Initialize Firebase Auth with retry mechanism
const initializeFirebaseAuth = (firebaseApp: FirebaseApp) => {
  try {
    console.log('Initializing Firebase Auth...');
    const authInstance = getAuth(firebaseApp);
    console.log('Firebase Auth initialized successfully');
    return authInstance;
  } catch (error) {
    console.error('Firebase Auth initialization failed:', error);
    return null;
  }
};

// Helper function to get auth with initialization check
export const getAuthInstance = () => {
  if (!auth && typeof window !== 'undefined') {
    if (!app) {
      app = initializeFirebaseApp();
    }
    
    if (app && !auth) {
      auth = initializeFirebaseAuth(app);
    }
  }
  return auth;
};

// Export initialized instances (may be null if initialization failed)
export { app, auth };
export default app;