import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from '@firebase/auth';
import { auth } from './firebase';
import { queryClient } from '@/lib/queryClient';

type FirebaseContextType = {
  user: User | null;
  loading: boolean;
};

const FirebaseContext = createContext<FirebaseContextType | null>(null);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Setting up Firebase auth state listener');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'No user');

      if (user) {
        try {
          // When Firebase authenticates, sync with backend session
          const response = await fetch('/api/auth/check', {
            credentials: 'include'
          });

          if (!response.ok) {
            console.error('Failed to sync auth state with backend');
            // Clear cached data and refetch
            await queryClient.invalidateQueries();
            localStorage.removeItem('userEmail');
          } else {
            // Store email for websocket identification
            const userIdentifier = user.email || 'Anonymous';
            localStorage.setItem('userEmail', userIdentifier);
            
            // Refetch data after successful auth
            await queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
            await queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
          }
        } catch (error) {
          console.error('Auth sync error:', error);
        }
      } else {
        localStorage.removeItem('userEmail');
      }

      setUser(user);
      setLoading(false);
    });

    return () => {
      console.log('Cleaning up Firebase auth state listener');
      unsubscribe();
    };
  }, []);

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