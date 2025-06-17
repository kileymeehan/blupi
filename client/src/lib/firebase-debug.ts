// Firebase debugging utilities to understand the initialization failure
import { getApps } from "firebase/app";

export const debugFirebaseState = () => {
  console.log('=== Firebase Debug State ===');
  console.log('Window available:', typeof window !== 'undefined');
  console.log('Firebase apps:', getApps().length);
  console.log('Firebase apps details:', getApps().map(app => ({
    name: app.name,
    options: app.options
  })));
  
  // Check if Firebase Auth is available
  try {
    const { getAuth } = require('firebase/auth');
    console.log('Firebase Auth module available:', typeof getAuth === 'function');
  } catch (error) {
    console.error('Firebase Auth module not available:', error);
  }
  
  // Check environment
  console.log('Environment variables available:', {
    NODE_ENV: process.env.NODE_ENV,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD
  });
  
  console.log('=== End Firebase Debug ===');
};