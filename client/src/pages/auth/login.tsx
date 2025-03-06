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
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    }
  };

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Hero content */}
      <div className="hidden lg:flex lg:w-1/3 bg-blue-600 text-white p-12 flex-col justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter mb-6">
            BLUPE
          </h1>
          <p className="text-xl font-light leading-relaxed opacity-90 max-w-md">
            A simple way to create and collaborate on your customer journeys.
          </p>
        </div>
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                ✨
              </div>
              <p className="text-lg">Intelligent workflow management</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                🤝
              </div>
              <p className="text-lg">Real-time collaboration</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                📊
              </div>
              <p className="text-lg">Dynamic project organization</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-2/3 flex items-center justify-center p-8 bg-gradient-to-br from-background to-muted/50">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground">
              Sign in to your account to continue
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full hover:bg-primary/5"
              onClick={handleGoogleSignIn}
            >
              <SiGoogle className="mr-2 h-4 w-4" />
              Sign in with Google
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
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
                  className="bg-background"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Password"
                  {...form.register("password")}
                  className="bg-background"
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Button
                variant="link"
                className="px-0"
                onClick={() => setLocation("/auth/register")}
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