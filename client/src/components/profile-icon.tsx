import { useEffect, useState } from "react";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function ProfileIcon() {
  const { user, devBypassEnabled } = useFirebaseAuth();
  const [emoji, setEmoji] = useState<string>(user?.photoURL || "👤");
  const [displayName, setDisplayName] = useState<string>(user?.displayName || "User");

  useEffect(() => {
    // Update emoji when user profile changes
    if (user?.photoURL) {
      setEmoji(user.photoURL);
    }
    
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }

    // Listen for profile updates
    const handleProfileUpdate = (event: CustomEvent) => {
      setEmoji(event.detail.photoURL);
      if (event.detail.displayName) {
        setDisplayName(event.detail.displayName);
      }
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate as EventListener);

    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate as EventListener);
    };
  }, [user?.photoURL, user?.displayName]);

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (!displayName) return "U";
    return displayName
      .split(" ")
      .map(name => name[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Determine avatar style based on dev mode
  const borderStyle = devBypassEnabled 
    ? "border-2 border-yellow-400" 
    : "border-2 border-white";

  // For dev mode, always show robot emoji
  const avatarContent = devBypassEnabled 
    ? (
      <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-white ${borderStyle}`}>
        <span className="text-lg">🤖</span>
      </div>
    ) 
    : (
      <Avatar className={`w-8 h-8 ${borderStyle}`}>
        {user?.photoURL && !user.photoURL.includes("data:text") ? (
          <AvatarImage src={user.photoURL} alt={displayName} />
        ) : null}
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          {emoji.length === 1 && emoji !== "👤" ? emoji : getInitials()}
        </AvatarFallback>
      </Avatar>
    );

  return avatarContent;
}
