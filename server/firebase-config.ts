import { GoogleAuthProvider } from 'firebase/auth';

// Configure Google Auth Provider with the correct client credentials
export const configureGoogleProvider = () => {
  const provider = new GoogleAuthProvider();
  
  // Use the OAuth client credentials from environment variables
  if (process.env.GOOGLE_CLIENT_ID) {
    provider.setCustomParameters({
      client_id: process.env.GOOGLE_CLIENT_ID
    });
  }
  
  provider.addScope('email');
  provider.addScope('profile');
  
  return provider;
};