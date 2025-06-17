import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-simple-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const AVATAR_OPTIONS = [
  // Sea creatures & aquatic
  "🐟", "🐠", "🐡", "🦈", "🐙", "🦀", "🦞", "🐚", "🦑", "🐳", "🐋", "🐬", 
  "🦭", "🐢", "🪼", "🐧", "🦩", "🦆",
  
  // Land animals
  "🐱", "🐭", "🐹", "🐰", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", 
  "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🦍", "🦧", "🐶", "🐕", "🦊", "🦝",
  "🐺", "🐘", "🦏", "🦛", "🦒", "🦌", "🐴", "🦓", "🐄", "🦙", "🦘", "🐪",
  
  // Birds
  "🐦", "🐤", "🐣", "🐥", "🦅", "🦆", "🦢", "🦉", "🦚", "🦜", "🐓", "🦃",
  
  // Fantasy & space
  "🦄", "🐲", "🔮", "⭐", "🌟", "✨", "🌙", "☀️", "🌈", "🎭", "🎪", "🎨",
  
  // Food avatars
  "🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🥝", "🍑", "🥭", "🍍",
  "🥥", "🌶️", "🫒", "🥑", "🍅", "🫚", "🥕", "🌽", "🥒", "🥬", "🥦", "🧄",
  
  // Nature & plants
  "🌸", "🌺", "🌻", "🌷", "🌹", "🌼", "🌵", "🌲", "🌳", "🍀", "🍃", "🌿",
  
  // Objects & symbols
  "🎯", "🎮", "🎲", "🎸", "🎹", "🎨", "📚", "🔬", "🎭", "🎪", "🎨", "🎯",
  "⚽", "🏀", "🎾", "🏈", "🥎", "🏐", "🏓", "🏸", "🥅", "⛳", "🎱", "🎳"
];

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [selectedAvatar, setSelectedAvatar] = useState<string>(AVATAR_OPTIONS[0]);
  const [displayName, setDisplayName] = useState<string>("");
  const [useGoogleAvatar, setUseGoogleAvatar] = useState<boolean>(true);

  // Update selected avatar and display name when user data changes
  useEffect(() => {
    if (user?.photoURL && AVATAR_OPTIONS.includes(user.photoURL)) {
      setSelectedAvatar(user.photoURL);
      setUseGoogleAvatar(false);
    } else if (user?.photoURL && !AVATAR_OPTIONS.includes(user.photoURL)) {
      // User has a Google profile image, use it by default
      setUseGoogleAvatar(true);
    }
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user]);

  const handleAvatarChange = async (newAvatar: string) => {
    try {
      setSelectedAvatar(newAvatar);
      setUseGoogleAvatar(false);
      
      // Dispatch a custom event to notify other components
      window.dispatchEvent(new CustomEvent('userProfileUpdated', {
        detail: { photoURL: newAvatar }
      }));
      
      toast({
        title: "Success",
        description: "Avatar updated!",
      });
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast({
        title: "Error",
        description: "Failed to update avatar",
        variant: "destructive",
      });
    }
  };

  const handleUseGoogleAvatar = async () => {
    try {
      setUseGoogleAvatar(true);
      
      // Dispatch a custom event to notify other components
      window.dispatchEvent(new CustomEvent('userProfileUpdated', {
        detail: { useGoogleAvatar: true, photoURL: user?.photoURL }
      }));
      
      toast({
        title: "Success",
        description: "Using Google profile image!",
      });
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast({
        title: "Error",
        description: "Failed to update avatar",
        variant: "destructive",
      });
    }
  };

  const handleDisplayNameChange = async () => {
    try {
      // Dispatch a custom event to notify other components
      window.dispatchEvent(new CustomEvent('userProfileUpdated', {
        detail: { displayName }
      }));
      
      toast({
        title: "Success",
        description: "Display name updated!",
      });
    } catch (error) {
      console.error('Error updating display name:', error);
      toast({
        title: "Error",
        description: "Failed to update display name",
        variant: "destructive",
      });
    }
  };



  const handleCancelAccount = async () => {
    try {
      await signOut();
      onOpenChange(false);
      toast({
        title: "Account cancelled",
        description: "Your account has been successfully cancelled",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel account",
        variant: "destructive",
      });
    }
  };

  const getCurrentAvatar = () => {
    if (useGoogleAvatar && user?.photoURL && !AVATAR_OPTIONS.includes(user.photoURL)) {
      return user.photoURL;
    }
    return selectedAvatar;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Profile Settings</DialogTitle>
          <DialogDescription className="text-gray-600">
            Manage your account settings and preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Plan Badge */}
          <div className="flex justify-center">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 font-medium">
              Beta Plan
            </Badge>
          </div>

          {/* Current Avatar Display */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              {useGoogleAvatar && user?.photoURL && !AVATAR_OPTIONS.includes(user.photoURL) ? (
                <Avatar className="w-16 h-16">
                  <AvatarImage src={user.photoURL} alt="Profile" />
                  <AvatarFallback>{user?.displayName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-16 h-16 flex items-center justify-center text-4xl bg-gray-100 rounded-full">
                  {selectedAvatar}
                </div>
              )}
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-sm font-medium">Display Name</Label>
            <div className="flex gap-2">
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                className="flex-1"
              />
              <Button 
                size="sm" 
                onClick={handleDisplayNameChange}
                disabled={!displayName.trim()}
              >
                Save
              </Button>
            </div>
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Email</Label>
            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded border">
              {user?.email}
            </p>
          </div>

          {/* Avatar Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Choose Your Avatar</Label>
            
            {/* Google Avatar Option */}
            {user?.photoURL && !AVATAR_OPTIONS.includes(user.photoURL) && (
              <div className="flex items-center gap-3 p-2 border rounded">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.photoURL} alt="Google Profile" />
                  <AvatarFallback>{user?.displayName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm">Use Google profile picture</span>
                <Button 
                  size="sm" 
                  variant={useGoogleAvatar ? "default" : "outline"}
                  onClick={handleUseGoogleAvatar}
                >
                  {useGoogleAvatar ? "Selected" : "Use"}
                </Button>
              </div>
            )}

            {/* Avatar Grid Selection */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Or choose a fun avatar:</p>
              <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto border rounded p-2">
                {AVATAR_OPTIONS.map((avatar: string) => (
                  <button
                    key={avatar}
                    onClick={() => handleAvatarChange(avatar)}
                    className={`
                      w-8 h-8 flex items-center justify-center text-lg rounded hover:bg-gray-100 transition-colors
                      ${selectedAvatar === avatar && !useGoogleAvatar ? 'bg-blue-100 ring-2 ring-blue-500' : ''}
                    `}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 text-sm p-2 h-auto">
                Cancel account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently cancel your
                  account and remove your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep account</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleCancelAccount}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Cancel account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}