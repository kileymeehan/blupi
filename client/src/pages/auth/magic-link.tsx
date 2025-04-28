import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
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

// Form schema
const magicLinkSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});
type MagicLinkForm = z.infer<typeof magicLinkSchema>;

export function MagicLinkPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { sendMagicLink } = useFirebaseAuth();

  const form = useForm<MagicLinkForm>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: MagicLinkForm) => {
    try {
      setIsSubmitting(true);
      await sendMagicLink(data.email);
      setEmailSent(true);
    } catch (error) {
      console.error("Error sending magic link:", error);
    } finally {
      setIsSubmitting(false);
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
          <CardTitle className="text-2xl text-center">Sign in with Magic Link</CardTitle>
          <CardDescription className="text-center">
            Enter your email to receive a secure sign-in link
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailSent ? (
            <Alert className="border-primary/20 bg-primary/5">
              <AlertDescription className="text-center py-4">
                <p className="font-semibold text-lg mb-2">Magic Link Sent!</p>
                <p>
                  We've emailed a secure sign-in link to{" "}
                  <span className="font-medium">{form.getValues().email}</span>.
                </p>
                <p className="mt-2">
                  Please check your inbox and click the link to sign in.
                </p>
              </AlertDescription>
            </Alert>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Magic Link"
                  )}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center text-muted-foreground">
            <span>or </span>
            <Link href="/auth/login">
              <Button variant="link" className="pl-1 pr-0 h-auto">
                sign in with password
              </Button>
            </Link>
          </div>
          <div className="text-sm text-center text-muted-foreground">
            <span>Don't have an account? </span>
            <Link href="/auth/register">
              <Button variant="link" className="pl-1 pr-0 h-auto">
                Register
              </Button>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default MagicLinkPage;