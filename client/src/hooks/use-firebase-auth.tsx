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
import { useToast } from './use-toast';

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? `User logged in: ${user.email}` : 'No user');
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      // Log detailed domain information before attempting sign-in
      console.log('Attempting Google sign-in from:', {
        domain: window.location.hostname,
        fullUrl: window.location.href,
        origin: window.location.origin,
        protocol: window.location.protocol
      });

      const provider = new GoogleAuthProvider();

      // Log the attempt
      console.log('Initializing Google sign-in popup...');

      const result = await signInWithPopup(auth, provider);
      console.log('Google sign-in successful:', {
        userEmail: result.user.email,
        userId: result.user.uid
      });

      toast({
        title: "Success",
        description: "Successfully signed in with Google",
      });
    } catch (error: any) {
      // Log detailed error information
      console.error('Google sign-in error:', {
        code: error.code,
        message: error.message,
        domain: window.location.hostname,
        errorInfo: error.customData ? error.customData : 'No custom data'
      });

      let errorMessage = "Failed to sign in with Google";

      if (error.code === 'auth/unauthorized-domain') {
        errorMessage = `Domain ${window.location.hostname} is not authorized. Please check Firebase Console > Authentication > Settings > Authorized domains`;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Success",
        description: "Successfully signed in",
      });
    } catch (error: any) {
      console.error('Email sign-in error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({
        title: "Success",
        description: "Account created successfully",
      });
    } catch (error: any) {
      console.error('Email sign-up error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
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