import { initializeApp } from "@firebase/app";
import { getAuth } from "@firebase/auth";

// Log domain information before initialization
const currentDomain = window.location.hostname;
console.log('Firebase initialization - Current domain info:', {
  hostname: currentDomain,
  fullUrl: window.location.href,
  origin: window.location.origin
});

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log('Firebase config (non-sensitive):', {
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId
});

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