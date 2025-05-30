import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Folder, LayoutGrid } from "lucide-react";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { CreateBlueprintDialog } from "@/components/create-blueprint-dialog";

const ANIMAL_EMOJIS = ["🦊", "🐼", "🦁", "🐯", "🐨", "🐮", "🐷", "🐸", "🐙", "🦒", "🦘", "🦔", "🦦", "🦥", "🦡"];

export default function ProfilePage() {
  const { user, logout, updateUserProfile } = useFirebaseAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedEmoji, setSelectedEmoji] = useState<string>(ANIMAL_EMOJIS[0]);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createBlueprintOpen, setCreateBlueprintOpen] = useState(false);

  // Update selected emoji when user data changes
  useEffect(() => {
    if (user?.photoURL) {
      setSelectedEmoji(user.photoURL);
    }
  }, [user?.photoURL]);

  const handleEmojiChange = async (newEmoji: string) => {
    try {
      if (user) {
        await updateUserProfile({
          photoURL: newEmoji
        });
        setSelectedEmoji(newEmoji);
      }
    } catch (error) {
      console.error('Error updating emoji:', error);
      toast({
        title: "Error",
        description: "Failed to update emoji",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    window.history.back(); // Go back to previous page instead of always going to dashboard
  };

  const handleDeleteAccount = async () => {
    try {
      // Here you would implement the account deletion logic
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
      <header className="border-b bg-[#302E87] shadow-sm">
        <div className="container flex h-24 items-center justify-between px-8">
          <div className="flex-1 flex items-center gap-6">
            <Link href="/" className="flex items-center">
              <img src="/Blupi-logomark-blue.png" alt="Blupi" className="h-7 bg-white p-1 rounded" />
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Create New Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="bg-[#F2918C] text-[#302E87] hover:bg-[#f07a73] font-medium h-9"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Create New
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem 
                  onClick={() => setCreateProjectOpen(true)}
                  className="cursor-pointer text-sm py-3 hover:bg-[#ffe8d6]/50"
                >
                  <Folder className="mr-2 h-4 w-4 text-[#302E87]" />
                  New Project
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setCreateBlueprintOpen(true)}
                  className="cursor-pointer text-sm py-3 hover:bg-[#ffe8d6]/50"
                >
                  <LayoutGrid className="mr-2 h-4 w-4 text-[#302E87]" />
                  New Blueprint
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      
      {/* Add dialog components */}
      <CreateProjectDialog 
        open={createProjectOpen} 
        onOpenChange={setCreateProjectOpen} 
      />
      <CreateBlueprintDialog 
        open={createBlueprintOpen} 
        onOpenChange={setCreateBlueprintOpen} 
      />

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
                  <SelectTrigger className="w-40">
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
                <p className="text-sm text-muted-foreground">Current Avatar: {selectedEmoji}</p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handleClose}>
              Close
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