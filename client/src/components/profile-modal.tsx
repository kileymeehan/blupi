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
      <DialogContent className="sm:max-w-md border-2 border-[#0A0A0F] rounded-none shadow-[8px_8px_0px_0px_#0A0A0F]">
        <DialogHeader className="border-b-2 border-[#0A0A0F] pb-4">
          <DialogTitle className="text-[#0A0A0F] font-black uppercase tracking-tight">Profile Settings</DialogTitle>
          <DialogDescription className="text-gray-600">
            Manage your account settings and preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Plan Badge */}
          <div className="flex justify-center">
            <Badge className="bg-[#1976D2] text-white font-bold uppercase tracking-wide rounded-none border-2 border-[#0A0A0F]">
              Beta Plan
            </Badge>
          </div>

          {/* Current Avatar Display */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              {useGoogleAvatar && user?.photoURL && !AVATAR_OPTIONS.includes(user.photoURL) ? (
                <Avatar className="w-16 h-16 border-2 border-[#0A0A0F] rounded-none">
                  <AvatarImage src={user.photoURL} alt="Profile" />
                  <AvatarFallback>{user?.displayName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-16 h-16 flex items-center justify-center text-4xl bg-gray-100 border-2 border-[#0A0A0F] rounded-none">
                  {selectedAvatar}
                </div>
              )}
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-sm font-bold uppercase tracking-wide text-[#0A0A0F]">Display Name</Label>
            <div className="flex gap-2">
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                className="flex-1 border-2 border-[#0A0A0F] rounded-none focus:ring-[#FFD600] focus:border-[#0A0A0F]"
              />
              <Button 
                size="sm" 
                onClick={handleDisplayNameChange}
                disabled={!displayName.trim()}
                className="bg-white text-[#0A0A0F] border-2 border-[#0A0A0F] rounded-none shadow-[2px_2px_0px_0px_#0A0A0F] hover:bg-[#FFD600] hover:shadow-none font-bold uppercase tracking-wide transition-all"
              >
                Save
              </Button>
            </div>
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-1">
            <Label className="text-sm font-bold uppercase tracking-wide text-[#0A0A0F]">Email</Label>
            <p className="text-sm text-gray-600 bg-gray-50 p-2 border-2 border-[#0A0A0F] rounded-none">
              {user?.email}
            </p>
          </div>

          {/* Avatar Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-bold uppercase tracking-wide text-[#0A0A0F]">Choose Your Avatar</Label>
            
            {/* Google Avatar Option */}
            {user?.photoURL && !AVATAR_OPTIONS.includes(user.photoURL) && (
              <div className="flex items-center gap-3 p-2 border-2 border-[#0A0A0F] rounded-none">
                <Avatar className="w-8 h-8 border border-[#0A0A0F] rounded-none">
                  <AvatarImage src={user.photoURL} alt="Google Profile" />
                  <AvatarFallback>{user?.displayName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm font-medium">Use Google profile picture</span>
                <Button 
                  size="sm" 
                  onClick={handleUseGoogleAvatar}
                  className={`rounded-none border-2 border-[#0A0A0F] font-bold uppercase tracking-wide ${useGoogleAvatar ? 'bg-[#0A0A0F] text-white' : 'bg-white text-[#0A0A0F] hover:bg-[#FFD600]'}`}
                >
                  {useGoogleAvatar ? "Selected" : "Use"}
                </Button>
              </div>
            )}

            {/* Avatar Grid Selection */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium">Or choose a fun avatar:</p>
              <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto border-2 border-[#0A0A0F] rounded-none p-2">
                {AVATAR_OPTIONS.map((avatar: string) => (
                  <button
                    key={avatar}
                    onClick={() => handleAvatarChange(avatar)}
                    className={`
                      w-8 h-8 flex items-center justify-center text-lg rounded-none hover:bg-[#FFD600] transition-colors
                      ${selectedAvatar === avatar && !useGoogleAvatar ? 'bg-[#FFD600] ring-2 ring-[#0A0A0F]' : ''}
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
        <div className="flex justify-between items-center pt-4 border-t-2 border-[#0A0A0F]">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-red-600 hover:text-white hover:bg-red-600 text-sm p-2 h-auto font-bold uppercase tracking-wide rounded-none border-2 border-transparent hover:border-red-600">
                Cancel account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-2 border-[#0A0A0F] rounded-none shadow-[8px_8px_0px_0px_#0A0A0F]">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-black uppercase tracking-tight text-[#0A0A0F]">Cancel your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently cancel your
                  account and remove your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-none border-2 border-[#0A0A0F] font-bold uppercase tracking-wide hover:bg-gray-100">Keep account</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleCancelAccount}
                  className="bg-red-600 hover:bg-red-700 rounded-none border-2 border-red-600 font-bold uppercase tracking-wide"
                >
                  Cancel account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button 
            onClick={() => onOpenChange(false)}
            className="bg-[#0A0A0F] text-white border-2 border-[#0A0A0F] rounded-none shadow-[2px_2px_0px_0px_#FFD600] hover:bg-[#FFD600] hover:text-[#0A0A0F] hover:shadow-none font-bold uppercase tracking-wide transition-all"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}