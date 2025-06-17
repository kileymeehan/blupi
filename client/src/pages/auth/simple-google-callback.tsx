import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function SimpleGoogleCallbackPage() {
  const [_, setLocation] = useLocation();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const { toast } = useToast();

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');

        if (error) {
          console.error('Google OAuth error:', error);
          setStatus('error');
          toast({
            title: "Authentication Failed",
            description: "Google authentication was cancelled or failed",
            variant: "destructive",
          });
          setTimeout(() => setLocation('/auth/login'), 2000);
          return;
        }

        if (!code) {
          console.error('No authorization code received');
          setStatus('error');
          toast({
            title: "Authentication Failed",
            description: "No authorization code received from Google",
            variant: "destructive",
          });
          setTimeout(() => setLocation('/auth/login'), 2000);
          return;
        }

        console.log('Processing Google OAuth callback with code:', code.substring(0, 10) + '...');
        
        // Send code to server for complete authentication
        const response = await fetch('/api/auth/google/exchange', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          throw new Error('Failed to exchange code for tokens');
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Authentication failed');
        }

        console.log('Successfully authenticated with Google');
        setStatus('success');
        
        toast({
          title: "Welcome!",
          description: "Successfully signed in with Google",
        });
        
        // Redirect to dashboard
        setTimeout(() => setLocation('/dashboard'), 1000);
        
      } catch (error) {
        console.error('Google callback error:', error);
        setStatus('error');
        toast({
          title: "Authentication Failed",
          description: error instanceof Error ? error.message : "Failed to complete sign-in",
          variant: "destructive",
        });
        setTimeout(() => setLocation('/auth/login'), 2000);
      }
    };

    handleGoogleCallback();
  }, [setLocation, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-[#FFE8D6]/30">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-[#302E87] border-t-transparent rounded-full animate-spin mx-auto"></div>
        
        {status === 'processing' && (
          <>
            <h2 className="text-2xl font-bold text-[#302E87]">Completing Sign-in</h2>
            <p className="text-[#6B6B97]">Please wait while we finish setting up your account...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <h2 className="text-2xl font-bold text-green-600">Success!</h2>
            <p className="text-[#6B6B97]">Redirecting to your dashboard...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <h2 className="text-2xl font-bold text-red-600">Authentication Failed</h2>
            <p className="text-[#6B6B97]">Redirecting back to login...</p>
          </>
        )}
      </div>
    </div>
  );
}