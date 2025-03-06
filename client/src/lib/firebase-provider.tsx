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
        console.error('Domain authorization error:', {
          currentDomain: window.location.hostname,
          message: error.message
        });
        toast({
          title: "Domain Error",
          description: `Please ensure ${window.location.hostname} is added to Firebase Console > Authentication > Settings > Authorized domains`,
          variant: "destructive",
        });
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