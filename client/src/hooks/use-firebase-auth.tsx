import { useState, useEffect } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
  updateProfile
} from '@firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Force a reload to get the latest profile data
          await user.reload();
          // Get the fresh user object after reload
          setUser(auth.currentUser);
        } catch (error) {
          console.error('Error reloading user:', error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateUserProfile = async (updates: { photoURL?: string }) => {
    if (!auth.currentUser) return;

    try {
      await updateProfile(auth.currentUser, updates);
      // Force a reload to ensure we have the latest data
      await auth.currentUser.reload();
      // Get fresh user object and update state
      const freshUser = auth.currentUser;
      setUser(freshUser);

      // Broadcast a custom event to notify other components
      window.dispatchEvent(new CustomEvent('userProfileUpdated', { 
        detail: { photoURL: freshUser.photoURL } 
      }));

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    // Check for redirect result when component mounts
    getRedirectResult(auth)
      .then((result) => {
        if (result) {
          toast({
            title: "Success",
            description: "Successfully signed in with Google",
          });
        }
      })
      .catch((error) => {
        console.error('Redirect sign-in error:', error);
        if (error.code !== 'auth/no-auth-event') {
          toast({
            title: "Error",
            description: "Failed to sign in with Google",
            variant: "destructive",
          });
        }
      });
  }, [toast]);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      // Using redirect instead of popup to avoid iframe issues
      await signInWithRedirect(auth, provider);
      // The actual auth handling happens in the useEffect with getRedirectResult
    } catch (error: any) {
      console.error('Sign-in error:', error);
      
      // Better error handling for domain issues
      if (error.code === 'auth/unauthorized-domain') {
        toast({
          title: "Domain Error",
          description: "This domain isn't authorized in Firebase. Please use email login or add this domain in Firebase Console.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to start Google sign-in",
          variant: "destructive",
        });
      }
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

  // Guest login functionality removed for security in production

  return {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logout,
    updateUserProfile
  };
}