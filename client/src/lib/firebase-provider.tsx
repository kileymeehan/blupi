import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { 
  User,
  onAuthStateChanged,
  getRedirectResult
} from '@firebase/auth';
import { auth } from './firebase';
import { useToast } from '@/hooks/use-toast';

type FirebaseContextType = {
  user: User | null;
  loading: boolean;
};

const FirebaseContext = createContext<FirebaseContextType | null>(null);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    console.log('Setting up Firebase auth state listener');
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'No user');
      setUser(user);
      setLoading(false);
    });

    // Check for redirect result on mount
    getRedirectResult(auth).catch((error) => {
      if (error.code === 'auth/unauthorized-domain') {
        const currentDomain = window.location.hostname;
        console.error('Domain authorization error:', {
          currentDomain,
          message: error.message,
          errorCode: error.code
        });

        toast({
          title: "Domain Not Authorized",
          description: `Please add "${currentDomain}" to Firebase Console:\n1. Go to Authentication > Settings\n2. Scroll to Authorized domains\n3. Click Add domain\n4. Enter: ${currentDomain}`,
          variant: "destructive",
          duration: 10000, // Show for longer since it's an important message
        });
      } else {
        console.error('Firebase redirect error:', error);
      }
    });

    return () => {
      console.log('Cleaning up Firebase auth state listener');
      unsubscribe();
    };
  }, [toast]);

  return (
    <FirebaseContext.Provider value={{ user, loading }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}