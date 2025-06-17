import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

// Synchronous Firebase configuration using environment variables
const getFirebaseConfig = () => {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;

  console.log('Firebase config check:', {
    hasApiKey: !!apiKey,
    hasAuthDomain: !!authDomain,
    hasProjectId: !!projectId,
    hasAppId: !!appId,
    hostname: window.location.hostname
  });

  // Ensure all required configuration is available from environment variables
  if (!apiKey || !authDomain || !projectId || !appId) {
    throw new Error('Firebase configuration is incomplete. Please ensure all required environment variables are set: VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID');
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket: "blupi-458414.appspot.com",
    messagingSenderId: "229356339230",
    appId
  };
};

// Initialize Firebase synchronously
let app: any = null;
let auth: any = null;
let isInitialized = false;

const initializeFirebase = () => {
  if (isInitialized && app && auth) {
    return { app, auth };
  }

  try {
    // Check if Firebase is already initialized
    const existingApps = getApps();
    if (existingApps.length > 0) {
      console.log('Firebase already initialized, using existing app');
      app = existingApps[0];
      auth = getAuth(app);
      isInitialized = true;
      return { app, auth };
    }

    const config = getFirebaseConfig();
    console.log('Initializing Firebase with config:', {
      apiKeyStart: config.apiKey?.substring(0, 10) + '...',
      projectId: config.projectId,
      authDomain: config.authDomain
    });
    
    // Initialize Firebase app first
    app = initializeApp(config);
    
    // Wait a moment before initializing auth to ensure app is fully registered
    setTimeout(() => {
      try {
        auth = getAuth(app);
        isInitialized = true;
        console.log('Firebase auth initialized successfully');
      } catch (authError) {
        console.error('Failed to initialize Firebase auth:', authError);
      }
    }, 100);
    
    // For immediate use, try to get auth but don't fail if not ready
    try {
      auth = getAuth(app);
      isInitialized = true;
      console.log('Firebase initialized successfully');
    } catch (authError) {
      console.warn('Auth not immediately available, will retry:', authError);
    }
    
    return { app, auth };
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw error;
  }
};

// Export the initialized Firebase instances
export const getFirebaseApp = () => {
  if (!app) {
    initializeFirebase();
  }
  return app;
};

export const getFirebaseAuth = () => {
  if (!auth || !isInitialized) {
    initializeFirebase();
    // If auth is still not available after initialization, wait and retry
    if (!auth && app) {
      try {
        auth = getAuth(app);
        isInitialized = true;
      } catch (error) {
        console.warn('Auth component not ready, will retry later:', error);
        // Return a promise that resolves when auth is ready
        return new Promise((resolve) => {
          const checkAuth = () => {
            try {
              auth = getAuth(app);
              isInitialized = true;
              resolve(auth);
            } catch (e) {
              setTimeout(checkAuth, 50);
            }
          };
          checkAuth();
        });
      }
    }
  }
  return auth;
};

// Initialize Firebase immediately when module loads
if (typeof window !== 'undefined') {
  try {
    initializeFirebase();
  } catch (error) {
    console.error('Critical Firebase initialization error:', error);
  }
}

// For backward compatibility, export auth
export { auth };
export default app;