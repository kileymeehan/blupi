// Alternative Google OAuth implementation for Replit environment
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { getAuthInstance } from '@/lib/firebase-init';

// Manual Google OAuth for environments where popup/redirect doesn't work
export const initiateGoogleAuth = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Google OAuth client ID not configured');
  }
  const redirectUri = `${window.location.origin}/auth/google-callback`;
  const scope = "openid email profile";
  
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scope)}&` +
    `access_type=offline&` +
    `prompt=select_account`;
  
  console.log('Redirecting to Google OAuth:', googleAuthUrl);
  window.location.href = googleAuthUrl;
};

// Exchange authorization code for tokens
export const exchangeCodeForTokens = async (code: string) => {
  try {
    const response = await fetch('/api/auth/google/exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens');
    }
    
    const tokens = await response.json();
    return tokens;
  } catch (error) {
    console.error('Token exchange error:', error);
    throw error;
  }
};

// Sign in to Firebase with Google ID token
export const signInWithGoogleToken = async (idToken: string) => {
  try {
    const authInstance = getAuthInstance();
    if (!authInstance) {
      throw new Error('Firebase auth not initialized');
    }
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(authInstance, credential);
    return result;
  } catch (error) {
    console.error('Firebase sign-in error:', error);
    throw error;
  }
};