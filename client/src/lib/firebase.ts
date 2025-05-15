import { initializeApp } from "@firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "@firebase/auth";

// Log all environment variables for debugging (without revealing sensitive values)
console.log('Firebase Environment Check:');
console.log('VITE_FIREBASE_API_KEY present:', !!import.meta.env.VITE_FIREBASE_API_KEY);
console.log('VITE_FIREBASE_PROJECT_ID present:', !!import.meta.env.VITE_FIREBASE_PROJECT_ID);
console.log('VITE_FIREBASE_APP_ID present:', !!import.meta.env.VITE_FIREBASE_APP_ID);

// Log domain information (important for Firebase Authentication domain verification)
const currentDomain = window.location.hostname;
console.log('Current host is:', currentDomain);
// Check if this is a main domain or a subdomain
const isMainDomain = currentDomain.split('.').length <= 2;
console.log('Is main domain?', isMainDomain);

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "345099176849",
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-5ZGZX4SLYS"
};

// Enhanced logging for Firebase config
console.log('Firebase Config (partial):', {
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId
});

// Reminder about domain authorization
console.log('⚠️ REMINDER: For Firebase Authentication to work properly, this domain must be added to Firebase Console > Authentication > Settings > Authorized Domains:');
console.log(`✅ Add this domain: ${window.location.hostname}`);

let app;
let auth: Auth;

try {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // Set language based on browser
  auth.useDeviceLanguage();
  
  // In development, we can use a local auth emulator if needed
  /*
  if (import.meta.env.DEV) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099');
    console.log('Using Firebase Auth Emulator');
  }
  */
  
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  console.error('Error details:', JSON.stringify(error));
  throw error;
}

export { app, auth };