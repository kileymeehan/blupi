import { useState, useEffect, createContext, useContext } from 'react';
import { getCompatAuthInstance, signInWithGoogleTokenCompat } from '@/lib/firebase-compat';
import firebase from 'firebase/compat/app';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: firebase.User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<firebase.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const authInstance = getCompatAuthInstance();
    if (!authInstance) {
      console.error('Firebase compat auth not available');
      setLoading(false);
      return;
    }

    console.log('Setting up Firebase compat auth listener...');
    
    const unsubscribe = authInstance.onAuthStateChanged((user) => {
      console.log('Auth state changed (compat):', user?.uid);
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const clearError = () => {
    setError(null);
  };

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const authInstance = getCompatAuthInstance();
      if (!authInstance) {
        throw new Error('Firebase compat auth not available');
      }
      await authInstance.signInWithEmailAndPassword(email, password);
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
      const authInstance = getCompatAuthInstance();
      if (!authInstance) {
        throw new Error('Firebase compat auth not available');
      }
      await authInstance.createUserWithEmailAndPassword(email, password);
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
      
      // Start Google OAuth flow
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

  const signOut = async () => {
    try {
      setError(null);
      const authInstance = getCompatAuthInstance();
      if (!authInstance) {
        throw new Error('Firebase compat auth not available');
      }
      await authInstance.signOut();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      });
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