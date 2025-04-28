import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { FcGoogle } from "react-icons/fc";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [_, setLocation] = useLocation();
  const { signUpWithEmail, signInWithGoogle, user } = useFirebaseAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
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
      await signUpWithEmail(data.email, data.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  });

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-[#FFE8D6]/30">
      <Card className="w-full max-w-md border-[#A1D9F5] shadow-lg">
        <CardHeader className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-[#302E87]">Create an account</h2>
          <p className="text-sm text-[#6B6B97]">
            Register to start creating blueprints
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
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
          </form>
          
          <div className="w-full flex items-center">
            <span className="border-t flex-grow"></span>
            <span className="px-3 text-sm text-[#6B6B97]">or</span>
            <span className="border-t flex-grow"></span>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full border-[#A1D9F5] text-[#302E87] flex items-center justify-center gap-2"
            onClick={() => {
              setError(null);
              setIsGoogleSigningIn(true);
              // The signInWithGoogle function will now handle redirects
              // We won't return to this page until after the Google authentication flow
              signInWithGoogle().catch(error => {
                // We'll only get here if there's an error initiating the redirect
                const err = error as { code?: string, message?: string };
                setError(err.message || "Could not start Google sign-in");
                setIsGoogleSigningIn(false);
              });
            }}
            disabled={isGoogleSigningIn}
          >
            <FcGoogle className="h-5 w-5" />
            {isGoogleSigningIn ? "Signing in..." : "Sign up with Google"}
          </Button>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-[#6B6B97]">
            Already have an account?{" "}
            <Button
              variant="link"
              className="px-0 text-[#302E87] hover:text-[#252270]"
              onClick={() => setLocation("/auth/login")}
            >
              Sign in
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}