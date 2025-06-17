// Google OAuth Configuration for Firebase
export const googleOAuthConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  projectId: "blupi-458414",
  authUri: "https://accounts.google.com/o/oauth2/auth",
  tokenUri: "https://oauth2.googleapis.com/token",
  authProviderX509CertUrl: "https://www.googleapis.com/oauth2/v1/certs",
  redirectUris: [
    "https://458f237e-8b36-4d99-a573-b4e09d6d4e2e-00-1i97kvg55t2vv.worf.replit.dev/auth/google-callback",
    "https://my.blupi.io/auth/google-callback",
    "https://www.blupi.io/auth/google-callback",
    "https://blupi.io/auth/google-callback",
    "http://localhost:3000/auth/google-callback",
    "http://localhost:5000/auth/google-callback"
  ]
};

// Environment variables for client-side Firebase config
export const getFirebaseClientConfig = () => ({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${process.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "345099176849",
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || "G-5ZGZX4SLYS"
});