import { initializeApp } from "@firebase/app";
import { getAuth } from "@firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "blueprints-48648.firebaseapp.com", // Use exact Firebase project domain
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  // Add explicit domain settings
  authEmulatorHost: window.location.hostname
};

console.log('Firebase initialization:', {
  currentDomain: window.location.hostname,
  projectDomain: firebaseConfig.authDomain
});

let app;
let auth;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  auth.useDeviceLanguage();
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw error;
}

export { app, auth };