import { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
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
      console.log('Authentication status check - auth object exists:', !!auth);
      
      // Sanitized email for logging (privacy protection)
      console.log('Login attempt for email:', email.substring(0, 3) + '***@***' + email.split('@')[1]);
      
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      console.log('Email sign-in successful');
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in",
      });
      
      return result.user;
    } catch (error: any) {
      console.error('Email sign-in error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // User-friendly error messages with more comprehensive handling
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
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
      } else if (error.code === 'auth/operation-not-allowed') {
        toast({
          title: "Email/Password Sign-In Not Enabled",
          description: "Email/Password authentication needs to be enabled in the Firebase Console. Please contact the administrator.",
          variant: "destructive",
          duration: 8000,
        });
        console.error('IMPORTANT: Enable Email/Password authentication in Firebase Console → Authentication → Sign-in methods');
      } else if (error.code === 'auth/invalid-email') {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
      } else if (error.code === 'auth/network-request-failed') {
        toast({
          title: "Network Error",
          description: "There was a problem connecting to the authentication service. Please check your internet connection.",
          variant: "destructive",
        });
      } else if (error.code === 'auth/internal-error') {
        toast({
          title: "Authentication Service Error",
          description: "There was an internal error in the authentication service. Please try again later.",
          variant: "destructive",
        });
        console.error('Firebase internal error. Check Firebase console and configuration.');
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

  // Email/password registration
  const signUpWithEmail = async (email: string, password: string) => {
    try {
      console.log('Creating new account...');
      
      // More detailed logging to help diagnose the issue
      console.log('Registration attempt for email:', email.substring(0, 3) + '***@***' + email.split('@')[1]);
      
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      console.log('Account creation successful');
      toast({
        title: "Welcome to Blupi!",
        description: "Your account has been created successfully",
      });
      
      return result.user;
    } catch (error: any) {
      console.error('Email sign-up error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Detailed error handling for debugging
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
      } else if (error.code === 'auth/operation-not-allowed') {
        toast({
          title: "Email/Password Sign-Up Not Enabled",
          description: "Email/Password authentication needs to be enabled in the Firebase Console. Please contact the administrator.",
          variant: "destructive",
          duration: 8000,
        });
        console.error('IMPORTANT: Enable Email/Password authentication in Firebase Console → Authentication → Sign-in methods');
      } else if (error.code === 'auth/invalid-email') {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
      } else if (error.code === 'auth/network-request-failed') {
        toast({
          title: "Network Error",
          description: "There was a problem connecting to the authentication service. Please check your internet connection.",
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

  // Send magic link email
  const sendMagicLink = async (email: string) => {
    try {
      console.log('Sending magic link to email:', email.substring(0, 3) + '***@***' + email.split('@')[1]);
      
      // Store the email in localStorage so we can use it on redirect
      localStorage.setItem('emailForSignIn', email);
      
      // URL to redirect to after sign-in
      const currentUrl = window.location.href;
      const baseUrl = currentUrl.split('/').slice(0, 3).join('/');
      const actionCodeSettings = {
        // URL you want to redirect back to. The domain must be in the authorized domains list in the Firebase Console.
        url: `${baseUrl}/auth/confirm-signin`,
        // This must be true
        handleCodeInApp: true
      };
      
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      
      console.log('Magic link email sent successfully');
      toast({
        title: "Check Your Email",
        description: "We've sent a sign-in link to your email. Click the link to sign in.",
        duration: 6000,
      });
      
      return true;
    } catch (error: any) {
      console.error('Magic link error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // User-friendly error messages
      if (error.code === 'auth/invalid-email') {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
      } else if (error.code === 'auth/operation-not-allowed') {
        toast({
          title: "Email Link Sign-In Not Enabled",
          description: "Email link authentication needs to be enabled in the Firebase Console. Please contact the administrator.",
          variant: "destructive",
          duration: 8000,
        });
        console.error('IMPORTANT: Enable Email Link authentication in Firebase Console → Authentication → Sign-in methods');
      } else if (error.code === 'auth/network-request-failed') {
        toast({
          title: "Network Error",
          description: "There was a problem connecting to the authentication service. Please check your internet connection.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "An error occurred while sending the sign-in link",
          variant: "destructive",
        });
      }
      throw error;
    }
  };
  
  // Complete sign-in with email link
  const completeMagicLinkSignIn = async (url: string, email?: string) => {
    try {
      console.log('Attempting to sign in with email link...');
      
      // Check if the link is a sign-in link
      if (!isSignInWithEmailLink(auth, url)) {
        console.error('Invalid sign-in link');
        toast({
          title: "Invalid Link",
          description: "The link you clicked is not a valid sign-in link. Please request a new one.",
          variant: "destructive",
        });
        return null;
      }
      
      // Get the email from localStorage if not provided
      let emailToUse = email;
      if (!emailToUse) {
        const storedEmail = localStorage.getItem('emailForSignIn');
        if (!storedEmail) {
          console.log('No email found. Asking user to provide email...');
          // We'll handle this in the UI by showing a form
          return { needsEmail: true };
        }
        emailToUse = storedEmail;
      }
      
      console.log('Signing in with email link with email:', emailToUse.substring(0, 3) + '***@***' + emailToUse.split('@')[1]);
      
      // Sign in with email link
      const result = await signInWithEmailLink(auth, emailToUse, url);
      
      // Clear email from storage
      localStorage.removeItem('emailForSignIn');
      
      console.log('Email link sign-in successful');
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in",
      });
      
      return result.user;
    } catch (error: any) {
      console.error('Email link sign-in error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // User-friendly error messages
      if (error.code === 'auth/invalid-email') {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
      } else if (error.code === 'auth/invalid-action-code') {
        toast({
          title: "Invalid or Expired Link",
          description: "The sign-in link has expired or has already been used. Please request a new one.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sign-In Error",
          description: error.message || "An error occurred during sign-in",
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  // Check if current URL is a sign-in link
  const isSignInLink = (url: string) => {
    return isSignInWithEmailLink(auth, url);
  };

  return {
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    sendMagicLink,
    completeMagicLinkSignIn,
    isSignInLink,
    logout,
    updateUserProfile
  };
}