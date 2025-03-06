import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const ANIMAL_EMOJIS = ["🦊", "🐼", "🦁", "🐯", "🐨", "🐮", "🐷", "🐸", "🐙", "🦒", "🦘", "🦔", "🦦", "🦥", "🦡"];

export default function ProfilePage() {
  const { user, logout, updateProfile } = useFirebaseAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedEmoji, setSelectedEmoji] = useState<string>("");

  // Initialize with user's current avatar if available
  useEffect(() => {
    if (user?.photoURL && ANIMAL_EMOJIS.includes(user.photoURL)) {
      setSelectedEmoji(user.photoURL);
    } else {
      setSelectedEmoji(ANIMAL_EMOJIS[0]);
    }
  }, [user]);

  const handleEmojiChange = async (emoji: string) => {
    try {
      setSelectedEmoji(emoji);
      await updateProfile({ photoURL: emoji });
      toast({
        title: "Success",
        description: "Your avatar has been updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update avatar",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await logout();
      navigate("/auth");
      toast({
        title: "Account deleted",
        description: "Your account has been successfully deleted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white shadow-sm">
        <div className="container flex h-16 items-center px-8">
          <h1 className="text-4xl font-black tracking-tighter font-mono bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            BLUPE
          </h1>
        </div>
      </header>

      <main className="container px-8 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>Manage your account settings and preferences</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Name</h3>
              <p className="text-sm text-muted-foreground">{user?.displayName || 'No name set'}</p>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-medium">Email</h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Choose Your Animal Avatar</h3>
              <div className="flex items-center gap-4">
                <Select
                  value={selectedEmoji}
                  onValueChange={handleEmojiChange}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue>{selectedEmoji}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ANIMAL_EMOJIS.map((emoji) => (
                      <SelectItem key={emoji} value={emoji}>
                        {emoji}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-sm text-muted-foreground">
                  This is how others will see you in collaborative blueprints
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => navigate("/")}>
              Back to Dashboard
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Account</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    account and remove your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount}>
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}