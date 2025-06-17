import { useEffect, useState } from "react";
import { useLocation } from "wouter";
// import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { isSignInWithEmailLink, signInWithEmailLink } from "@firebase/auth";
import { auth } from "@/lib/auth";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ConfirmSignInPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsEmail, setNeedsEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const handleSignIn = async () => {
      try {
        // Check if this is a valid sign-in link
        if (!isSignInWithEmailLink(auth, window.location.href)) {
          setError("Invalid sign-in link");
          setLoading(false);
          return;
        }

        // Try to get email from localStorage first
        let userEmail = localStorage.getItem('emailForSignIn');
        
        if (!userEmail) {
          // If no email stored, ask user to enter it
          setNeedsEmail(true);
          setLoading(false);
          return;
        }

        // Complete the sign-in
        await signInWithEmailLink(auth, userEmail, window.location.href);
        
        // Clean up
        localStorage.removeItem('emailForSignIn');
        setSuccess(true);
        
        toast({
          title: "Welcome!",
          description: "You've been successfully signed in",
        });

        // Redirect to home after a brief delay
        setTimeout(() => {
          setLocation('/');
        }, 2000);

      } catch (error: any) {
        console.error('Sign-in error:', error);
        setError(error.message || "Failed to sign in");
      } finally {
        setLoading(false);
      }
    };

    handleSignIn();
  }, [setLocation, toast]);

  const handleEmailSubmit = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailLink(auth, email, window.location.href);
      
      setSuccess(true);
      toast({
        title: "Welcome!",
        description: "You've been successfully signed in",
      });

      setTimeout(() => {
        setLocation('/');
      }, 2000);

    } catch (error: any) {
      console.error('Sign-in error:', error);
      setError(error.message || "Failed to sign in");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-6">
            <img 
              src="/Blupi-logomark-blue.png" 
              alt="Blupi Logo" 
              className="h-12 w-auto" 
            />
          </div>
          <CardTitle className="text-2xl text-center">
            {success ? "Welcome!" : "Confirming Sign-In"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-center text-muted-foreground">
                Completing your sign-in...
              </p>
            </div>
          ) : success ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-center py-4">
                <p className="font-semibold text-lg mb-2 text-green-800">Sign-in Successful!</p>
                <p className="text-green-700">
                  You'll be redirected to your dashboard in a moment.
                </p>
              </AlertDescription>
            </Alert>
          ) : error ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setLocation('/auth/login')}
              >
                Back to Sign In
              </Button>
            </div>
          ) : needsEmail ? (
            <div className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50">
                <AlertDescription className="text-blue-800">
                  Please enter the email address you used to request the magic link.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your-email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                />
              </div>
              <Button 
                onClick={handleEmailSubmit} 
                className="w-full"
                disabled={!email}
              >
                Complete Sign-In
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export default ConfirmSignInPage;