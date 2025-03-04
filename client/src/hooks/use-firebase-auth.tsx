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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');

      const result = await signInWithPopup(auth, provider);

      toast({
        title: "Success",
        description: "Successfully signed in with Google",
      });

      return result.user;
    } catch (error: any) {
      console.error('Sign-in error:', error);

      let errorMessage = "Failed to sign in with Google";
      if (error.code === 'auth/unauthorized-domain') {
        errorMessage = "Please ensure the current domain is authorized in Firebase Console";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
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