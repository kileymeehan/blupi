import { initializeApp } from "@firebase/app";
import { getAuth, onAuthStateChanged } from "@firebase/auth";

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app;
let auth;

try {
  console.log('Firebase config:', {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? 'present' : 'missing',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ? 'present' : 'missing',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ? 'present' : 'missing'
  });
  
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  auth.useDeviceLanguage();

  // Initialize auth state listener
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('Auth state changed:', 'User logged in');
      try {
        // When Firebase authenticates, sync with backend session
        const response = await fetch('/api/auth/check', {
          credentials: 'include'
        });

        if (!response.ok) {
          console.error('Failed to sync auth state with backend');
          // Instead of reloading, we'll clear local storage
          localStorage.removeItem('userEmail');
        } else {
          console.log('Auth sync successful');
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
  console.error('Error details:', JSON.stringify(error));
  // Fall back to original Firebase config if environment variables are missing
  try {
    const fallbackConfig = {
      apiKey: "AIzaSyDALLWQjfh2pqyPPhj8qaJK-C9yISk6X2c",
      authDomain: "blueprints-48648.firebaseapp.com",
      projectId: "blueprints-48648",
      storageBucket: "blueprints-48648.appspot.com",
      messagingSenderId: "345099176849",
      appId: "1:345099176849:web:d22dc10d20986e3a2aa830",
      measurementId: "G-5ZGZX4SLYS"
    };
    console.log('Trying fallback Firebase config');
    app = initializeApp(fallbackConfig);
    auth = getAuth(app);
    auth.useDeviceLanguage();
  } catch (fallbackError) {
    console.error('Even fallback Firebase config failed:', fallbackError);
    throw fallbackError;
  }
}

export { app, auth };