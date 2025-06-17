import { useState, useEffect, createContext, useContext } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getFirebaseAuth } from '@/lib/firebase-config';
import { sendSignInLinkToEmail, signInWithEmailLink, isSignInWithEmailLink } from 'firebase/auth';

interface SimpleUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

interface AuthContextType {
  user: SimpleUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  confirmMagicLink: (url: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const userData = await response.json();
          if (userData.user) {
            console.log('[CLIENT AUTH] Session user data:', userData.user);
            console.log('[CLIENT AUTH] User UID:', userData.user.uid);
            console.log('[CLIENT AUTH] parseInt(uid):', parseInt(userData.user.uid));
            console.log('[CLIENT AUTH] isNaN(parseInt(uid)):', isNaN(parseInt(userData.user.uid)));
            setUser(userData.user);
          }
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const clearError = () => {
    setError(null);
  };

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        throw new Error('Sign in failed');
      }
      
      const data = await response.json();
      setUser(data.user);
      
      toast({
        title: "Welcome back!",
        description: "Successfully signed in",
      });
    } catch (error: any) {
      console.error('Sign in error:', error);
      const errorMessage = error.message || 'Failed to sign in';
      setError(errorMessage);
      toast({
        title: "Sign In Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        throw new Error('Sign up failed');
      }
      
      const data = await response.json();
      setUser(data.user);
      
      toast({
        title: "Account created!",
        description: "Welcome to Blupi",
      });
    } catch (error: any) {
      console.error('Sign up error:', error);
      const errorMessage = error.message || 'Failed to create account';
      setError(errorMessage);
      toast({
        title: "Sign Up Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = signIn;

  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Start Google OAuth flow - server handles everything
      console.log('Starting Google OAuth flow...');
      window.location.href = '/api/auth/google';
    } catch (error: any) {
      console.error('Google sign in error:', error);
      const errorMessage = error.message || 'Failed to sign in with Google';
      setError(errorMessage);
      toast({
        title: "Google Sign In Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const sendMagicLink = async (email: string) => {
    try {
      setError(null);
      setLoading(true);
      
      console.log('[Magic Link] Starting magic link send for:', email);
      
      const auth = await getFirebaseAuth();
      if (!auth) {
        throw new Error('Firebase auth not initialized');
      }
      
      console.log('[Magic Link] Firebase auth ready, sending magic link...');
      
      const actionCodeSettings = {
        url: `${window.location.origin}/auth/magic-link?email=${encodeURIComponent(email)}`,
        handleCodeInApp: true,
      };
      
      console.log('[Magic Link] Action code settings:', actionCodeSettings);
      
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      
      // Store email in localStorage for verification later
      localStorage.setItem('emailForSignIn', email);
      
      console.log('[Magic Link] Magic link sent successfully');
      
      toast({
        title: "Magic Link Sent",
        description: `Check your email at ${email} for the sign-in link`,
      });
    } catch (error: any) {
      console.error('[Magic Link] Send error:', error);
      const errorMessage = error.message || 'Failed to send magic link';
      setError(errorMessage);
      toast({
        title: "Magic Link Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const confirmMagicLink = async (url: string) => {
    try {
      setError(null);
      setLoading(true);
      
      console.log('[Magic Link] Starting magic link confirmation for URL:', url);
      
      const auth = await getFirebaseAuth();
      if (!auth) {
        throw new Error('Firebase auth not initialized');
      }
      
      if (!isSignInWithEmailLink(auth, url)) {
        console.log('[Magic Link] URL is not a valid sign-in link:', url);
        throw new Error('Invalid magic link');
      }
      
      console.log('[Magic Link] Valid magic link detected');
      
      let email = localStorage.getItem('emailForSignIn');
      if (!email) {
        // If email is not stored, prompt user for it
        email = window.prompt('Please provide your email for confirmation');
        if (!email) {
          throw new Error('Email is required for magic link confirmation');
        }
      }
      
      console.log('[Magic Link] Confirming magic link for email:', email);
      
      const result = await signInWithEmailLink(auth, email, url);
      
      console.log('[Magic Link] Firebase sign-in successful:', result.user);
      
      // Clean up stored email
      localStorage.removeItem('emailForSignIn');
      
      // Convert Firebase user to our SimpleUser format
      const user: SimpleUser = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL
      };
      
      console.log('[Magic Link] Creating backend session for user:', user);
      
      // Create backend session for magic link authentication
      try {
        const sessionResponse = await fetch('/api/auth/google-callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          }),
        });
        
        console.log('[Magic Link] Backend session response status:', sessionResponse.status);
        
        if (!sessionResponse.ok) {
          const errorText = await sessionResponse.text();
          console.error('[Magic Link] Failed to create backend session:', errorText);
          throw new Error('Failed to create backend session');
        }
        
        console.log('[Magic Link] Backend session created successfully');
      } catch (sessionError) {
        console.error('[Magic Link] Error creating backend session:', sessionError);
        throw sessionError;
      }
      
      setUser(user);
      
      toast({
        title: "Welcome!",
        description: "Successfully signed in with magic link",
      });
    } catch (error: any) {
      console.error('[Magic Link] Confirmation error:', error);
      const errorMessage = error.message || 'Failed to confirm magic link';
      setError(errorMessage);
      toast({
        title: "Magic Link Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      
      const response = await fetch('/api/auth/signout', {
        method: 'POST'
      });
      
      if (response.ok) {
        setUser(null);
        toast({
          title: "Signed out",
          description: "You have been signed out successfully",
        });
      }
    } catch (error: any) {
      console.error('Sign out error:', error);
      const errorMessage = error.message || 'Failed to sign out';
      setError(errorMessage);
      toast({
        title: "Sign Out Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signInWithEmail,
      signInWithGoogle,
      sendMagicLink,
      confirmMagicLink,
      signOut,
      error,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};