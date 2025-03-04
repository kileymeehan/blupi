import { initializeApp } from "@firebase/app";
import { getAuth } from "@firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "blueprints-48648.firebaseapp.com",
  projectId: "blueprints-48648",
  storageBucket: "blueprints-48648.appspot.com",
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

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