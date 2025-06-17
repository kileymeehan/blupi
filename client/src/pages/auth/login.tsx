import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-simple-auth";
import { useToast } from "@/hooks/use-toast";
import { SiGoogle } from "react-icons/si";

import { ComingSoonBadge } from "@/components/ui/coming-soon-badge";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  console.log('LoginPage component rendering');
  const [_, setLocation] = useLocation();
  const { signInWithEmail, signInWithGoogle, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
            <img src="/blupi-logomark-white.png" alt="Blupi" className="h-10" />
          </h1>
          <p className="text-xl font-light leading-relaxed text-[#A1D9F5] max-w-md">
            A simple way to create and collaborate on your customer journeys.
          </p>
        </div>
        <div className="space-y-8 relative z-10">
          <div className="flex justify-center mb-8">
            <img 
              src="/blupi-pufferfish-new.png" 
              alt="Blupi Mascot" 
              className="w-32 h-32 object-contain opacity-80"
            />
          </div>
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
            <Button 
              variant="outline" 
              className="w-full border-[#A1D9F5] text-[#302E87] flex items-center justify-center gap-2"
              onClick={async () => {
                try {
                  await signInWithGoogle();
                } catch (error) {
                  setError(error instanceof Error ? error.message : "Google sign-in failed");
                }
              }}
            >
              <SiGoogle className="w-4 h-4" />
              Sign in with Google
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full border-[#A1D9F5] text-[#302E87]"
              onClick={() => setLocation(`/auth/magic-link`)}
            >
              Sign in with Magic Link
            </Button>
            
            <Button 
              variant="link" 
              className="w-full text-[#6B6B97] hover:text-[#302E87]"
              onClick={() => {
                toast({
                  title: "Password Reset",
                  description: "Password reset feature will be available soon",
                });
              }}
            >
              Forgot your password?
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