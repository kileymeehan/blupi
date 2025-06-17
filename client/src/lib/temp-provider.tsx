// Temporary provider to handle broken imports while cleaning up
import { createContext, useContext } from 'react';

const TempContext = createContext<any>(null);

export function useFirebase() {
  return { user: null, loading: false };
}

export function useFirebaseAuth() {
  return {
    sendMagicLink: () => Promise.resolve(),
    confirmSignIn: () => Promise.resolve(),
  };
}