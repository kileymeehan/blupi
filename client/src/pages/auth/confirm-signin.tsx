import { useState, useEffect } from "react";
import { useLocation, useRoute, useRouter } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

// Form schema for when the email isn't available
const emailSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});
type EmailForm = z.infer<typeof emailSchema>;

export function ConfirmSignInPage() {
  const [location, navigate] = useLocation();
  const { completeMagicLinkSignIn, isSignInLink } = useFirebaseAuth();
  
  // UI States
  const [isProcessing, setIsProcessing] = useState(true);
  const [needsEmail, setNeedsEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form for email collection if needed
  const form = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  // Process the magic link on component mount
  useEffect(() => {
    const processLink = async () => {
      try {
        // Check if this is actually a sign-in link
        if (!isSignInLink(window.location.href)) {
          setError("Invalid sign-in link. Please request a new one.");
          setIsProcessing(false);
          return;
        }

        const result = await completeMagicLinkSignIn(window.location.href);
        
        // If we need the user to provide their email
        if (result && 'needsEmail' in result) {
          setNeedsEmail(true);
          setIsProcessing(false);
          return;
        }
        
        // Success!
        setSuccess(true);
        setIsProcessing(false);
        
        // Redirect to home page after short delay
        setTimeout(() => {
          navigate("/");
        }, 2000);
      } catch (error) {
        console.error("Error processing sign-in link:", error);
        setError("There was a problem signing you in. Please try again.");
        setIsProcessing(false);
      }
    };

    processLink();
  }, [completeMagicLinkSignIn, isSignInLink, navigate]);

  // Handle email submission when needed
  const onSubmit = async (data: EmailForm) => {
    try {
      setIsProcessing(true);
      await completeMagicLinkSignIn(window.location.href, data.email);
      setSuccess(true);
      
      // Redirect to home page after short delay
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error) {
      console.error("Error signing in with email:", error);
      setError("There was a problem signing you in. Please try again.");
    } finally {
      setIsProcessing(false);
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
          <CardTitle className="text-2xl text-center">Sign In Confirmation</CardTitle>
          <CardDescription className="text-center">
            {isProcessing
              ? "Please wait while we sign you in..."
              : success
              ? "You have been successfully signed in!"
              : needsEmail
              ? "Please confirm your email address"
              : "Verifying your sign-in link..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {isProcessing && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-center py-2">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-primary/20 bg-primary/5">
              <AlertDescription className="text-center py-4">
                <p className="font-semibold mb-2">Sign-in Successful!</p>
                <p>
                  You are now signed in. You'll be redirected to the home page
                  in a moment.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {needsEmail && !error && !success && (
            <>
              <Alert className="mb-4">
                <AlertDescription>
                  Please enter the email address that you used to request the
                  sign-in link.
                </AlertDescription>
              </Alert>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="your-email@example.com"
                            type="email"
                            autoComplete="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      "Complete Sign In"
                    )}
                  </Button>
                </form>
              </Form>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          {(error || needsEmail) && (
            <div className="text-sm text-center">
              <Button
                variant="outline"
                onClick={() => navigate("/auth/magic-link")}
                className="w-full"
              >
                Request New Sign-In Link
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export default ConfirmSignInPage;