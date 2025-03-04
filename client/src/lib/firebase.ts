import { initializeApp } from "@firebase/app";
import { getAuth } from "@firebase/auth";

// Use exact domain matching for authentication
const domain = window.location.hostname;
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // Use the exact current domain for auth
  authDomain: domain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log('Initializing Firebase with domain:', domain);

let app;
let auth;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  auth.useDeviceLanguage();
  console.log('Firebase initialized successfully, auth instance created');
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw error;
}

export { app, auth };