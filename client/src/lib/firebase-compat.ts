// Firebase compat initialization - more reliable in Replit environment
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase using compat API
let app: firebase.app.App | null = null;
let auth: firebase.auth.Auth | null = null;

const initializeFirebaseCompat = () => {
  if (typeof window === 'undefined') return { app: null, auth: null };
  
  // Validate required Firebase configuration
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    console.error('Firebase configuration incomplete. Required environment variables: VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID');
    return { app: null, auth: null };
  }
  
  try {
    console.log('Initializing Firebase with compat API...');
    
    if (!firebase.apps.length) {
      app = firebase.initializeApp(firebaseConfig);
      console.log('Firebase compat app initialized');
    } else {
      app = firebase.apps[0];
      console.log('Using existing Firebase compat app');
    }
    
    if (app) {
      auth = app.auth();
      console.log('Firebase compat auth initialized:', !!auth);
    }
    
    return { app, auth };
  } catch (error) {
    console.error('Firebase compat initialization failed:', error);
    return { app: null, auth: null };
  }
};

// Initialize immediately
const result = initializeFirebaseCompat();
app = result.app;
auth = result.auth;

// Helper function to get auth instance
export const getCompatAuthInstance = () => {
  if (!auth && typeof window !== 'undefined') {
    const initResult = initializeFirebaseCompat();
    auth = initResult.auth;
  }
  return auth;
};

// Sign in with Google ID token using compat API
export const signInWithGoogleTokenCompat = async (idToken: string) => {
  try {
    const authInstance = getCompatAuthInstance();
    if (!authInstance) {
      throw new Error('Firebase compat auth not initialized');
    }
    
    const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
    const result = await authInstance.signInWithCredential(credential);
    return result;
  } catch (error) {
    console.error('Firebase compat sign-in error:', error);
    throw error;
  }
};

export { app as compatApp, auth as compatAuth };
export default app;