import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { SiGoogle } from "react-icons/si";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [_, setLocation] = useLocation();
  const { signInWithEmail, signInWithGoogle, user } = useFirebaseAuth();
  const [error, setError] = useState<string | null>(null);

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
    try {
      await signInWithEmail(data.email, data.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  });

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      // Log error for debugging
      if (err instanceof Error) {
        console.error('Google Sign-in error:', err);
        
        if (err.toString().includes('auth/unauthorized-domain')) {
          // Domain authorization issue - show specific error with instructions
          const currentDomain = window.location.hostname;
          setError(`Domain Authorization Required: Add "${currentDomain}" to Firebase Console → Authentication → Settings → Authorized domains. This can take up to 15 minutes to propagate.`);
        } else {
          setError(err.message);
        }
      } else {
        setError("Google sign-in failed");
      }
    }
  };
  
  // Alternative authentication explanation
  const alternativeAuthInfo = (
    <div className="mt-4 text-sm text-muted-foreground">
      <p className="font-medium">Firebase Domain Authorization Issue?</p>
      <p className="mt-1">If Google Sign-in doesn't work, please:</p>
      <ol className="list-decimal pl-5 mt-1 space-y-1">
        <li>Add your current domain to Firebase Console</li>
        <li>Wait up to 15 minutes for changes to propagate</li>
        <li>Or use email/password authentication in the meantime</li>
      </ol>
    </div>
  );

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
            <div className="flex flex-col space-y-2">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm">
                <h3 className="font-medium text-yellow-800">Domain Authorization Required</h3>
                <p className="text-yellow-700 mt-1">
                  We're experiencing issues with Firebase domain authorization. Please use email login below instead.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full hover:bg-[#302E87]/5 border-[#A1D9F5] opacity-70"
                onClick={handleGoogleSignIn}
              >
                <SiGoogle className="mr-2 h-4 w-4 text-[#302E87]" />
                Sign in with Google (May not work)
              </Button>
              <p className="text-xs text-gray-500 text-center">
                <span className="italic">Domain Authorization Error:</span> Add <span className="font-mono text-xs text-amber-600 font-bold">{window.location.hostname}</span> to Firebase authorized domains
              </p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#A1D9F5]/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-[#6B6B97]">
                  Or continue with
                </span>
              </div>
            </div>
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
              <Button type="submit" className="w-full bg-[#302E87] hover:bg-[#252270]">
                Sign in
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-[#6B6B97]">
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