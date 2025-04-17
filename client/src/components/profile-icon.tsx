import { useEffect, useState } from "react";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";

export function ProfileIcon() {
  const { user } = useFirebaseAuth();
  const [emoji, setEmoji] = useState<string>(user?.photoURL || "👤");

  useEffect(() => {
    // Update emoji when user profile changes
    if (user?.photoURL) {
      setEmoji(user.photoURL);
    }

    // Listen for profile updates
    const handleProfileUpdate = (event: CustomEvent) => {
      setEmoji(event.detail.photoURL);
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate as EventListener);

    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate as EventListener);
    };
  }, [user?.photoURL]);

  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white">
      <span className="text-lg">{emoji}</span>
    </div>
  );
}
