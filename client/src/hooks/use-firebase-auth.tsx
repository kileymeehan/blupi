import { useState, useEffect } from 'react';
import { 
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

  // Set up auth state listener
  useEffect(() => {
    console.log('Setting up Firebase auth state listener');
    
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
  }, []);

  // Update user profile (e.g., avatar)
  const updateUserProfile = async (updates: { photoURL?: string }) => {
    if (!auth.currentUser) return;

    try {
      await updateProfile(auth.currentUser, updates);
      await auth.currentUser.reload();
      const freshUser = auth.currentUser;
      setUser(freshUser);

      // Notify other components
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
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
        toast({
          title: "Authentication Failed",
          description: "Invalid email or password. Please try again.",
          variant: "destructive",
        });
      } else if (error.code === 'auth/too-many-requests') {
        toast({
          title: "Too Many Attempts",
          description: "Account temporarily locked due to too many failed login attempts. Please try again later or reset your password.",
          variant: "destructive",
          duration: 6000,
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "An error occurred during sign-in",
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  // Email/password registration
  const signUpWithEmail = async (email: string, password: string) => {
    try {
      console.log('Creating new account...');
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      console.log('Account creation successful');
      toast({
        title: "Welcome to Blupi!",
        description: "Your account has been created successfully",
      });
      
      return result.user;
    } catch (error: any) {
      console.error('Email sign-up error:', error);
      
      // User-friendly error messages
      if (error.code === 'auth/email-already-in-use') {
        toast({
          title: "Email Already Registered",
          description: "This email is already associated with an account. Please sign in instead.",
          variant: "destructive",
        });
      } else if (error.code === 'auth/weak-password') {
        toast({
          title: "Weak Password",
          description: "Please choose a stronger password (at least 6 characters).",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Registration Error",
          description: error.message || "An error occurred during registration",
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

  return {
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    logout,
    updateUserProfile
  };
}