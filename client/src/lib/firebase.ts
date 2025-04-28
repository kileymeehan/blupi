import { initializeApp } from "@firebase/app";
import { getAuth, onAuthStateChanged, connectAuthEmulator, type Auth } from "@firebase/auth";

// Function to determine if we're running in a Replit environment
const isReplitEnvironment = () => {
  const hostname = window.location.hostname;
  return hostname.includes('replit.dev') || hostname.includes('repl.co');
};

// Function to get the appropriate authDomain based on environment
const getAuthDomain = () => {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "blueprints-48648";
  const hostname = window.location.hostname;
  
  // If we're in a Replit environment, we need special handling
  if (isReplitEnvironment()) {
    // Log for debugging
    console.log('Running in Replit environment, using special auth configuration');
    
    // In Replit, we have a few options:
    // 1. Try using the Firebase provided auth domain (most reliable when configured)
    // 2. Try using the current hostname (works if this specific domain is authorized)
    // 3. For deployment, use a consistent subdomain
    
    // If we're in development with a random Replit subdomain
    if (hostname.includes('-00-')) {
      // Option 2: Try using the current hostname directly
      return hostname;
    }
    
    // For a stable Replit deployment
    // Option 1: Firebase default (if you've manually authorized this in Firebase Console)
    return `${projectId}.firebaseapp.com`;
  }
  
  // Default Firebase authDomain for production
  return `${projectId}.firebaseapp.com`;
};

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDALLWQjfh2pqyPPhj8qaJK-C9yISk6X2c",
  authDomain: getAuthDomain(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "blueprints-48648",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "blueprints-48648"}.appspot.com`,
  messagingSenderId: "345099176849",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:345099176849:web:d22dc10d20986e3a2aa830",
  measurementId: "G-5ZGZX4SLYS"
};

let app;
let auth: Auth;

// Log current hostname for Firebase domain debugging
const hostname = window.location.hostname;
const isMainDomain = !hostname.includes('-00-');  // Check if we're on the main replit domain

// The exact domain that needs to be authorized in Firebase Console:
console.log('Current hostname:', hostname);
console.log('Is main domain?', isMainDomain);
console.log('Auth domain set to:', firebaseConfig.authDomain);

// Note: When using Replit, you need to authorize all possible domains in Firebase console
// For Replit Dev environment, add these domains to Firebase authorized domains:
// 1. Your specific replit.dev domain (the one logged above)
// 2. *.replit.dev as a wildcard if possible

try {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  auth.useDeviceLanguage();
  
  // In development, we can use a local auth emulator (optional)
  if (import.meta.env.DEV && false) { // Set to true to enable emulator
    // Connect to Firebase Auth Emulator
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    console.log('Connected to Firebase Auth Emulator');
  }
  
  console.log('Setting up Firebase auth state listener');

  // Initialize auth state listener
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('Auth state changed:', 'User signed in');
      try {
        // When Firebase authenticates, sync with backend session
        const response = await fetch('/api/auth/check', {
          credentials: 'include'
        });

        if (!response.ok) {
          console.error('Failed to sync auth state with backend');
          // Instead of reloading, we'll clear local storage
          localStorage.removeItem('userEmail');
        }
      } catch (error) {
        console.error('Auth sync error:', error);
      }
    } else {
      console.log('Auth state changed:', 'No user');
      // Clear any stored auth data
      localStorage.removeItem('userEmail');
    }
  });
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw error;
}

export { app, auth };