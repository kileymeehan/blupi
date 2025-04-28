import { initializeApp } from "@firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "@firebase/auth";

// Log all environment variables for debugging (without revealing sensitive values)
console.log('Firebase Environment Check:');
console.log('VITE_FIREBASE_API_KEY present:', !!import.meta.env.VITE_FIREBASE_API_KEY);
console.log('VITE_FIREBASE_PROJECT_ID present:', !!import.meta.env.VITE_FIREBASE_PROJECT_ID);
console.log('VITE_FIREBASE_APP_ID present:', !!import.meta.env.VITE_FIREBASE_APP_ID);

// Firebase configuration directly from Firebase console
const firebaseConfig = {
  apiKey: "AIzaSyDALLWQjfh2pqyPPhj8qaJK-C9yISk6X2c",
  authDomain: "blueprints-48648.firebaseapp.com",
  projectId: "blueprints-48648",
  storageBucket: "blueprints-48648.firebasestorage.app",
  messagingSenderId: "345099176849",
  appId: "1:345099176849:web:d22dc10d20986e3a2aa830",
  measurementId: "G-5ZGZX4SLYS"
};

console.log('Firebase Config (partial):', {
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId
});

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