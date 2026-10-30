import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-simple-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

export function ProfileIcon() {
  const { user } = useAuth();
  const [selectedAvatar, setSelectedAvatar] = useState<string>("🐟");
  const [useGoogleAvatar, setUseGoogleAvatar] = useState<boolean>(true);
  const [displayName, setDisplayName] = useState<string>(user?.displayName || "User");

  useEffect(() => {
    // Initialize with Google profile image if available
    if (user?.photoURL && !AVATAR_OPTIONS.includes(user.photoURL)) {
      setUseGoogleAvatar(true);
    } else if (user?.photoURL && AVATAR_OPTIONS.includes(user.photoURL)) {
      setSelectedAvatar(user.photoURL);
      setUseGoogleAvatar(false);
    } else {
      // Default to Google avatar if user has photoURL
      setUseGoogleAvatar(!!user?.photoURL);
    }
    
    if (user?.displayName) {
      setDisplayName(user.displayName);
    } else if (user?.email) {
      // Fallback to email-based display name
      setDisplayName(user.email.split('@')[0]);
    }

    // Listen for profile updates
    const handleProfileUpdate = (event: CustomEvent) => {
      if (event.detail.useGoogleAvatar) {
        setUseGoogleAvatar(true);
      } else if (event.detail.photoURL && AVATAR_OPTIONS.includes(event.detail.photoURL)) {
        setSelectedAvatar(event.detail.photoURL);
        setUseGoogleAvatar(false);
      }
      
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

  // Determine avatar style
  const borderStyle = "rounded border-2 border-[color:var(--card-border)]";

  // Render Google avatar or emoji avatar
  if (useGoogleAvatar && user?.photoURL && !AVATAR_OPTIONS.includes(user.photoURL)) {
    return (
      <Avatar className={`w-8 h-8 rounded ${borderStyle}`}>
        <AvatarImage src={user.photoURL} alt={displayName} />
        <AvatarFallback className="bg-ds-accent text-white text-xs rounded">
          {getInitials()}
        </AvatarFallback>
      </Avatar>
    );
  }

  // Render emoji avatar
  return (
    <div className={`w-8 h-8 flex items-center justify-center text-lg bg-gray-100 rounded ${borderStyle}`}>
      {selectedAvatar}
    </div>
  );
}
