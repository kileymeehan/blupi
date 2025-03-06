import { initializeApp } from "@firebase/app";
import { getAuth } from "@firebase/auth";

// Firebase configuration - be explicit about domain settings
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // Keep the original Firebase domain as authDomain
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: "345099176849",
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: "G-5ZGZX4SLYS"
};

let app;
let auth;

try {
  // Log configuration for debugging
  console.log('Firebase initialization config:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    currentDomain: window.location.hostname,
    currentOrigin: window.location.origin
  });

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);

  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw error;
}

export { app, auth };