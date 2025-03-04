import { useState, useEffect } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User
} from '@firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthError = (error: any) => {
    console.error('Authentication error:', {
      code: error.code,
      message: error.message,
      errorInfo: error
    });

    let errorMessage = "Authentication failed";

    switch (error.code) {
      case 'auth/network-request-failed':
        errorMessage = "Network error. Please check your connection and try again.";
        break;
      case 'auth/unauthorized-domain':
        errorMessage = "Authentication domain error. Please try again in a moment.";
        break;
      default:
        errorMessage = error.message;
    }

    toast({
      title: "Error",
      description: errorMessage,
      variant: "destructive",
    });
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();

      // Add required scopes
      provider.addScope('profile');
      provider.addScope('email');

      // Force account selection
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await signInWithPopup(auth, provider);

      toast({
        title: "Success",
        description: "Successfully signed in with Google",
      });

      return result.user;
    } catch (error: any) {
      handleAuthError(error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Success",
        description: "Successfully signed in",
      });
      return result.user;
    } catch (error: any) {
      handleAuthError(error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      toast({
        title: "Success",
        description: "Account created successfully",
      });
      return result.user;
    } catch (error: any) {
      handleAuthError(error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Success",
        description: "Successfully signed out",
      });
    } catch (error: any) {
      handleAuthError(error);
      throw error;
    }
  };

  return {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logout
  };
}