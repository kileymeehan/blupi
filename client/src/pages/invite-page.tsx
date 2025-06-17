import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Users, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const EMOJI_OPTIONS = [
  // Animals
  "🦊", "🐼", "🦁", "🐯", "🐨", "🐮", "🐷", "🐸", "🐙", "🦒", "🦘", "🦔", "🦦", "🦥", "🦡", 
  "🐶", "🐱", "🐭", "🐹", "🐰", "🦝", "🐺", "🐻", "🐵", "🙈", "🙉", "🙊", "🐒", "🦍", "🦧",
  "🐕", "🐈", "🐅", "🐆", "🦓", "🦏", "🦛", "🐘", "🦣", "🐪", "🐫", "🐄", "🐂", "🐃",
  "🐎", "🦄", "🐖", "🐗", "🐏", "🐑", "🐐", "🐓", "🐔", "🐣", "🐤", "🐥", "🐦",
  // Faces & People
  "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍",
  "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫",
  "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤",
  // Fantasy & Objects  
  "🤖", "👽", "🛸", "👻", "💀", "🎃", "🎭", "🎨", "🎪", "🎸", "🎹", "🎤", "🎧", "🎮", "🎲",
  "⚡", "🔥", "💫", "⭐", "🌟", "✨", "🌈", "☀️", "🌙", "💎", "🔮", "🏆", "🎯", "🚀", "🛡️"
];

const onboardingSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  profileImageUrl: z.string().url().optional().or(z.literal(""))
});

type OnboardingForm = z.infer<typeof onboardingSchema>;

interface InviteDetails {
  email: string;
  teamName: string;
  inviterName: string;
  role: string;
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string>(EMOJI_OPTIONS[0]);

  // Fetch invite details
  const { data: inviteDetails, error: inviteError, isLoading } = useQuery<InviteDetails>({
    queryKey: [`/api/invite/${token}`],
    enabled: !!token,
  });

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      username: "",
      email: inviteDetails?.email || "",
      firstName: "",
      lastName: "",
      profileImageUrl: ""
    }
  });

  // Update email when invite details are loaded
  useEffect(() => {
    if (inviteDetails?.email) {
      form.setValue("email", inviteDetails.email);
    }
  }, [inviteDetails, form]);

  const acceptInviteMutation = useMutation({
    mutationFn: async (data: OnboardingForm) => {
      const response = await apiRequest("POST", `/api/invite/${token}/accept`, {
        ...data,
        profileImageUrl: selectedEmoji
      });
      return response.json();
    },
    onSuccess: () => {
      // Save the selected emoji to localStorage so it appears immediately as profile icon
      localStorage.setItem('blupi_dev_user_emoji', selectedEmoji);
      toast({
        title: "Welcome to the team!",
        description: "Your account has been created successfully.",
      });
      setLocation("/"); // Redirect to dashboard
    },
    onError: (error: any) => {
      toast({
        title: "Failed to accept invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAcceptInvite = () => {
    setShowOnboarding(true);
  };

  const onSubmit = (data: OnboardingForm) => {
    acceptInviteMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (inviteError || !inviteDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid, expired, or has already been used.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setLocation("/")} variant="outline">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <img 
              src="/Blupi-logomark-blue.png" 
              alt="Blupi" 
              className="h-12 mx-auto mb-4"
            />
            <h1 className="text-3xl font-bold text-gray-900">You're Invited!</h1>
            <p className="text-muted-foreground mt-2">
              Join your team on Blupi and start collaborating
            </p>
          </div>

          {/* Invitation Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start space-x-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl">{inviteDetails.teamName}</CardTitle>
                  <CardDescription className="mt-1">
                    <strong>{inviteDetails.inviterName}</strong> has invited you to join their team
                  </CardDescription>
                </div>
                <Badge variant="secondary">{inviteDetails.role}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>Invited: {inviteDetails.email}</span>
                </div>
                
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    You'll be able to view and collaborate on team blueprints, 
                    add comments, and contribute to project discussions.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>

          {/* Action Button */}
          <div className="text-center">
            <Button 
              onClick={handleAcceptInvite}
              size="lg"
              className="w-full max-w-sm"
            >
              Accept Invitation & Create Account
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              By accepting, you agree to create an account and join the team
            </p>
          </div>
        </div>
      </div>

      {/* Onboarding Modal */}
      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Profile</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Avatar Selection */}
            <div className="space-y-2">
              <Label>Choose Your Avatar</Label>
              <div className="flex items-center gap-4">
                <div className="text-4xl bg-gray-50 p-2 rounded-lg border">
                  {selectedEmoji}
                </div>
                <Select
                  value={selectedEmoji}
                  onValueChange={setSelectedEmoji}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue>{selectedEmoji}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <SelectItem key={emoji} value={emoji}>
                        <span className="text-lg">{emoji}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  {...form.register("firstName")}
                  placeholder="John"
                />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  {...form.register("lastName")}
                  placeholder="Doe"
                />
                {form.formState.errors.lastName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                {...form.register("username")}
                placeholder="johndoe"
              />
              {form.formState.errors.username && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                {...form.register("email")}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...form.register("password")}
                placeholder="Choose a secure password"
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={acceptInviteMutation.isPending}
            >
              {acceptInviteMutation.isPending ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}