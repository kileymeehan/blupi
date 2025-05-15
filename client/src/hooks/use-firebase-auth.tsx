import { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  type User,
  updateProfile
} from '@firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

// Create a development user type that mimics Firebase User
interface DevUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  metadata: {
    creationTime: string;
    lastSignInTime: string;
  };
  reload: () => Promise<void>;
}

// Check if we're in development mode
const isDevelopment = true; // Always true for Replit

// Create a dev user to bypass Firebase auth
const createDevUser = (): DevUser => {
  const now = new Date().toISOString();
  return {
    uid: 'dev-user-123',
    email: 'dev@example.com',
    displayName: 'Development User',
    photoURL: "🤖", // Robot emoji for dev mode
    emailVerified: true,
    isAnonymous: false,
    metadata: {
      creationTime: now,
      lastSignInTime: now
    },
    reload: async () => Promise.resolve()
  };
};

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | DevUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // Check for dev bypass in localStorage
  const [devBypassEnabled, setDevBypassEnabled] = useState(() => {
    return localStorage.getItem('blupi_dev_bypass') === 'true';
  });

  // Set up auth state listener
  useEffect(() => {
    console.log('Setting up Firebase auth state listener');
    
    // If dev bypass is enabled, use a dev user
    if (isDevelopment && devBypassEnabled) {
      console.log('Using development user bypass');
      const devUser = createDevUser();
      setUser(devUser as any);
      setLoading(false);
      return () => {};
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log('Auth state changed: User is signed in');
        try {
          // Refresh user data
          await user.reload();
          setUser(auth.currentUser);
          
          // Sync with backend
          try {
            await fetch('/api/auth/check', {
              credentials: 'include'
            });
          } catch (err) {
            console.error('Error syncing with backend:', err);
          }
        } catch (error) {
          console.error('Error refreshing user data:', error);
        }
      } else {
        console.log('Auth state changed: No user');
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [devBypassEnabled]);

  // Google sign-in using popup method
  const signInWithGoogle = async () => {
    try {
      console.log('Attempting to sign in with Google...');
      
      // Create provider
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      provider.setCustomParameters({ prompt: 'select_account' });
      
      // Show popup instructions
      toast({
        title: "Google Sign-in",
        description: "Please complete the sign-in in the popup window",
        duration: 3000,
      });
      
      // Use popup for sign-in
      const result = await signInWithPopup(auth, provider);
      
      // Process successful result
      console.log('Google sign-in successful');
      toast({
        title: "Sign-in Successful",
        description: "You've successfully signed in with Google",
      });
      
      return result.user;
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      
      // Handle common popup errors
      if (error.code === 'auth/popup-closed-by-user') {
        toast({
          title: "Sign-in Cancelled",
          description: "The sign-in popup was closed. Please try again.",
          duration: 5000,
        });
      } else if (error.code === 'auth/popup-blocked') {
        toast({
          title: "Popup Blocked",
          description: "Please enable popups for this site and try again.",
          variant: "destructive",
          duration: 6000,
        });
      } else if (error.code === 'auth/unauthorized-domain') {
        const currentDomain = window.location.hostname;
        toast({
          title: "Domain Not Authorized",
          description: `Domain ${currentDomain} not authorized in Firebase.`,
          variant: "destructive",
          duration: 8000,
        });
      } else {
        toast({
          title: "Sign-in Error",
          description: error.message || "An error occurred during sign-in",
          variant: "destructive",
        });
      }
      
      throw error;
    }
  };

  // Email/password signin
  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log('Attempting email/password sign-in...');
      
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      console.log('Email sign-in successful');
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in",
      });
      
      return result.user;
    } catch (error: any) {
      console.error('Email sign-in error:', error);
      
      // User-friendly error messages
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        toast({
          title: "Authentication Failed",
          description: "Invalid email or password. Please try again.",
          variant: "destructive",
        });
      } else if (error.code === 'auth/too-many-requests') {
        toast({
          title: "Too Many Attempts",
          description: "Account temporarily locked. Please try again later.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sign-in Error",
          description: error.message || "An error occurred during sign-in",
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  // Sign out
  const logout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out",
      });
    } catch (error: any) {
      console.error('Sign-out error:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Dev mode bypass functions with password protection
  const DEV_BYPASS_PASSWORD = process.env.NODE_ENV === 'production' 
    ? import.meta.env.VITE_DEV_BYPASS_PASSWORD || 'blupi-dev-2025' 
    : '';
  
  const enableDevBypass = async (password?: string) => {
    // In production, require a password match
    if (process.env.NODE_ENV === 'production') {
      if (!password || password !== DEV_BYPASS_PASSWORD) {
        toast({
          title: "Access Denied",
          description: "Incorrect development bypass password",
          variant: "destructive"
        });
        return false;
      }
    }
    
    localStorage.setItem('blupi_dev_bypass', 'true');
    setDevBypassEnabled(true);
    
    toast({
      title: "Development Mode Enabled",
      description: "You are now bypassing Firebase authentication.",
    });
    
    // Create dev user
    const devUser = createDevUser();
    setUser(devUser as any);
    
    return true;
  };
  
  const disableDevBypass = () => {
    localStorage.removeItem('blupi_dev_bypass');
    setDevBypassEnabled(false);
    setUser(null);
    toast({
      title: "Development Mode Disabled",
      description: "Firebase authentication is now required.",
    });
  };

  return {
    user,
    loading,
    signInWithEmail,
    signInWithGoogle,
    logout,
    // Development mode properties
    devBypassEnabled,
    enableDevBypass,
    disableDevBypass
  };
}
