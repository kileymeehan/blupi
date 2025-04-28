import { initializeApp } from "@firebase/app";
import { getAuth, onAuthStateChanged, type Auth } from "@firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDALLWQjfh2pqyPPhj8qaJK-C9yISk6X2c",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "blueprints-48648"}.firebaseapp.com`,
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
const fullUrl = window.location.href;
const isMainDomain = hostname === 'replit.dev' || hostname.endsWith('.replit.dev');

console.log('Current host is:', hostname);
console.log('Is main domain?', isMainDomain);

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  auth.useDeviceLanguage();
  
  console.log('Setting up Firebase auth state listener');

  // Initialize auth state listener
  onAuthStateChanged(auth, async (user) => {
    if (user) {
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
      // Clear any stored auth data
      localStorage.removeItem('userEmail');
    }
  });
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw error;
}

export { app, auth };