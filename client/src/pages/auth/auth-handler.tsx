import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { getRedirectResult, getAuth } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * This component handles OAuth redirects and other authentication flows
 * It serves as a landing page after authentication redirects
 */
export default function AuthHandlerPage() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    // Since we're using popup-only auth, just redirect to login
    console.log('Auth handler accessed - redirecting to login since we use popup auth');
    setLocation('/auth/login');
  }, [setLocation]);
  
  // Go to login
  const handleLoginClick = () => {
    setLocation('/auth/login');
  };
  
  // Go to homepage
  const handleHomeClick = () => {
    setLocation('/');
  };

  // If still processing, show a loading state
  if (processing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-[350px] shadow-lg">
          <CardHeader>
            <CardTitle>Authenticating...</CardTitle>
            <CardDescription>Please wait while we complete your sign-in</CardDescription>
          </CardHeader>
          <CardContent className="text-center py-4">
            <div className="relative h-8 w-8 mx-auto">
              <div className="absolute animate-ping h-full w-full rounded-full bg-primary/30"></div>
              <div className="absolute h-full w-full rounded-full border-2 border-primary animate-spin"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // If there was an error, show the error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-[450px] shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Authentication Error</CardTitle>
            <CardDescription>We encountered a problem signing you in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 my-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              This could be due to an expired session, canceled authentication, or domain authorization issues.
            </p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleHomeClick}>Go Home</Button>
            <Button onClick={handleLoginClick}>Try Again</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Default state - completed but no user
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[350px] shadow-lg">
        <CardHeader>
          <CardTitle>Authentication Complete</CardTitle>
          <CardDescription>Redirecting you to the application...</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">You'll be redirected to login in a moment</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={handleLoginClick}>Go to Login</Button>
        </CardFooter>
      </Card>
    </div>
  );
}