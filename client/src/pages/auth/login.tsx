import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { useToast } from "@/hooks/use-toast";
import { SiGoogle } from "react-icons/si";
import { GoogleAuthProvider, signInWithPopup } from "@firebase/auth";
import { auth } from "@/lib/firebase";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [_, setLocation] = useLocation();
  const { signInWithEmail, signInWithGoogle, user, enableDevBypass, devBypassEnabled } = useFirebaseAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const onSubmit = form.handleSubmit(async (data) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      await signInWithEmail(data.email, data.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  });

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Hero content */}
      <div className="hidden lg:flex lg:w-1/3 bg-[#302E87] text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <svg width="100%" height="100%" fill="none">
            <pattern id="blueprint-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#blueprint-grid)" />
          </svg>
        </div>
        <div className="relative z-10">
          <h1 className="mb-6">
            <img src="/Blupi-logomark-blue.png" alt="Blupi" className="h-12 bg-white p-1 rounded" />
          </h1>
          <p className="text-xl font-light leading-relaxed text-[#A1D9F5] max-w-md">
            A simple way to create and collaborate on your customer journeys.
          </p>
        </div>
        <div className="space-y-8 relative z-10">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#A1D9F5]/30 flex items-center justify-center text-xl">
                ✨
              </div>
              <p className="text-lg">Intelligent workflow management</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#A1D9F5]/30 flex items-center justify-center text-xl">
                🤝
              </div>
              <p className="text-lg">Real-time collaboration</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#A1D9F5]/30 flex items-center justify-center text-xl">
                📊
              </div>
              <p className="text-lg">Dynamic project organization</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-2/3 flex items-center justify-center p-8 bg-gradient-to-br from-white to-[#FFE8D6]/30">
        <Card className="w-full max-w-md border-[#A1D9F5] shadow-lg">
          <CardHeader className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-[#302E87]">Welcome back</h2>
            <p className="text-sm text-[#6B6B97]">
              Sign in to your account to continue
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Email"
                  {...form.register("email")}
                  className="bg-white border-[#A1D9F5] focus-visible:ring-[#302E87]"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-[#F2918C]">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Password"
                  {...form.register("password")}
                  className="bg-white border-[#A1D9F5] focus-visible:ring-[#302E87]"
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-[#F2918C]">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
              {error && (
                <p className="text-sm text-[#F2918C]">{error}</p>
              )}
              <Button 
                type="submit" 
                className="w-full bg-[#302E87] hover:bg-[#252270]"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <div className="w-full flex items-center">
              <span className="border-t flex-grow"></span>
              <span className="px-3 text-sm text-[#6B6B97]">or</span>
              <span className="border-t flex-grow"></span>
            </div>
            
            <Button 
              type="button"
              variant="outline" 
              className="w-full flex items-center justify-center gap-2 border-[#4285F4] hover:bg-[#4285F4]/5 text-[#4285F4]"
              onClick={(e) => {
                e.preventDefault(); // Ensure no form submission happens
                
                // Clear previous errors
                setError(null);
                setIsGoogleSubmitting(true);
                
                // Extended diagnostic logging
                console.log("0. Checking Firebase config...");
                console.log("Firebase config:", {
                  authDomain: import.meta.env.VITE_FIREBASE_PROJECT_ID + ".firebaseapp.com",
                  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
                  currentDomain: window.location.hostname,
                });
                
                try {
                  // Create provider directly in the click handler - important for browser security
                  console.log("1. Creating Google provider...");
                  const provider = new GoogleAuthProvider();
                  provider.addScope('profile');
                  provider.addScope('email');
                  
                  // Ensure we request account selection
                  provider.setCustomParameters({ 
                    prompt: 'select_account'
                  });
                  
                  // Show loading toast
                  toast({
                    title: "Opening Google Sign-in",
                    description: "Please watch for the popup window...",
                    duration: 3000,
                  });
                  
                  console.log("2. About to call signInWithPopup...");
                  
                  // Call signInWithPopup directly in the button click event handler
                  signInWithPopup(auth, provider)
                    .then((result) => {
                      console.log("3. Popup returned successfully!");
                      
                      // Success notification
                      toast({
                        title: "Sign-in Successful",
                        description: "You've successfully signed in with Google"
                      });
                      
                      // Log the user info (without sensitive data)
                      console.log("Sign-in completed with user:", result.user.uid);
                      
                      // The user state change will be handled by onAuthStateChanged
                    })
                    .catch((error) => {
                      console.error("3. Popup error:", error);
                      console.error("Full error details:", JSON.stringify({
                        code: error.code,
                        message: error.message,
                        customData: error.customData
                      }));
                      
                      // Handle specific error cases with user-friendly messages
                      if (error.code === 'auth/popup-closed-by-user') {
                        toast({
                          title: "Sign-in Cancelled",
                          description: "The popup was closed. Please try again.",
                          duration: 5000,
                        });
                        
                        console.log("IMPORTANT: Add domain to Firebase authorized domains!");
                        console.log("Go to Firebase Console → Authentication → Settings → Authorized Domains");
                        console.log("Add:", window.location.hostname);
                      } else if (error.code === 'auth/popup-blocked') {
                        toast({
                          title: "Popup Blocked",
                          description: "Please allow popups for this site and try again.",
                          variant: "destructive",
                        });
                      } else if (error.code === 'auth/unauthorized-domain') {
                        const currentDomain = window.location.hostname;
                        toast({
                          title: "Domain Not Authorized",
                          description: `Domain ${currentDomain} not authorized in Firebase.`,
                          variant: "destructive",
                        });
                        console.log("IMPORTANT: Add domain to Firebase authorized domains!");
                        console.log("Go to Firebase Console → Authentication → Settings → Authorized Domains");
                        console.log("Add:", currentDomain);
                      } else {
                        toast({
                          title: "Sign-in Error",
                          description: error.message || "An error occurred during sign-in",
                          variant: "destructive",
                        });
                      }
                    })
                    .finally(() => {
                      console.log("4. Sign-in process completed");
                      setIsGoogleSubmitting(false);
                    });
                } catch (unexpectedError) {
                  // Catch any synchronous errors that might happen before the popup
                  console.error("Unexpected error during sign-in setup:", unexpectedError);
                  toast({
                    title: "Sign-in Setup Error",
                    description: "An unexpected error occurred while setting up the sign-in process.",
                    variant: "destructive",
                  });
                  setIsGoogleSubmitting(false);
                }
              }}
              disabled={isGoogleSubmitting}
            >
              {isGoogleSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-[#4285F4] border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <SiGoogle className="h-4 w-4" />
                  Sign in with Google
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full border-[#A1D9F5] text-[#302E87]"
              onClick={() => setLocation(`/auth/magic-link`)}
            >
              Sign in with Magic Link
            </Button>
            
            <Button 
              variant="outline" 
              className={`w-full border-amber-400 ${devBypassEnabled ? 'bg-amber-100' : ''} text-amber-700 mt-2`}
              onClick={() => {
                enableDevBypass();
                toast({
                  title: "Development Bypass Enabled",
                  description: "You can now access the app without Firebase authentication.",
                });
                // Redirect to home page after a short delay
                setTimeout(() => {
                  setLocation("/");
                }, 500);
              }}
            >
              Development Bypass Mode
            </Button>
            
            <p className="text-sm text-[#6B6B97] pt-2">
              Don't have an account?{" "}
              <Button
                variant="link"
                className="px-0 text-[#302E87] hover:text-[#252270]"
                onClick={() => setLocation(`/auth/register`)}
              >
                Register
              </Button>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}