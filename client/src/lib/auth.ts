import { 
  getAuth,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { getFirebaseAuth } from "./firebase-config";

// Auth instance - will be initialized asynchronously
let authInstance: any = null;

// Get auth instance with proper async initialization
const getAuthInstance = async () => {
  if (!authInstance) {
    authInstance = await getFirebaseAuth();
  }
  return authInstance;
};

// Export auth for backward compatibility (may be null initially)
export let auth: any = null;

// Initialize auth immediately
getAuthInstance().then(instance => {
  auth = instance;
}).catch(console.error);

// Authentication functions
export async function signInWithEmail(email: string, password: string) {
  const authInstance = await getAuthInstance();
  return signInWithEmailAndPassword(authInstance, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  const authInstance = await getAuthInstance();
  return createUserWithEmailAndPassword(authInstance, email, password);
}

export async function signInWithGoogle() {
  const authInstance = await getAuthInstance();
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  
  // Add custom parameters to ensure proper popup handling
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  
  try {
    // Use popup with proper error handling
    const result = await signInWithPopup(authInstance, provider);
    console.log('Google sign-in completed successfully', result);
    return result;
  } catch (error: any) {
    console.error('Google sign-in failed:', error);
    
    // If popup was closed by user, provide a helpful message
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in was cancelled. Please try again and complete the authentication in the popup window.');
    }
    
    // Re-throw other errors as-is
    throw error;
  }
}

export async function logout() {
  const authInstance = await getAuthInstance();
  return signOut(authInstance);
}

// Auth state listener
export async function onAuthStateChange(callback: (user: User | null) => void) {
  const authInstance = await getAuthInstance();
  return onAuthStateChanged(authInstance, callback);
}

// Handle redirect result after Firebase initialization
export async function handleRedirectResult() {
  try {
    const authInstance = await getAuthInstance();
    const result = await getRedirectResult(authInstance);
    if (result?.user) {
      console.log("✅ Signed in as", result.user);
      return result;
    } else {
      console.log("ℹ️ No redirect result found (user not signed in)");
      return null;
    }
  } catch (error) {
    console.error("🚫 Error getting redirect result:", error);
    throw error;
  }
}

