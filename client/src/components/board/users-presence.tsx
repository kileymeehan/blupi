import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ConnectedUser {
  id: string;
  name: string;
  color: string;
  emoji?: string; // Add emoji field
}

interface UsersPresenceProps {
  users: ConnectedUser[];
}

const ANIMAL_EMOJIS = ["🦊", "🐼", "🦁", "🐯", "🐨", "🐮", "🐷", "🐸", "🐙", "🦒", "🦘", "🦔", "🦦", "🦥", "🦡"];

function getAnimalEmoji(id: string | number): string {
  // Convert id to string if it's not already
  const idString = String(id);

  // Generate a simple hash from the string
  const hash = idString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ANIMAL_EMOJIS[Math.abs(hash) % ANIMAL_EMOJIS.length];
}

export function UsersPresence({ users }: UsersPresenceProps) {
  return (
    <div className="flex -space-x-2">
      <TooltipProvider>
        {users.map((user) => (
          <Tooltip key={user.id}>
            <TooltipTrigger asChild>
              <Avatar className="w-8 h-8 border border-black bg-white ring-0">
                <AvatarFallback 
                  style={{ 
                    backgroundColor: `${user.color}15`,
                    color: user.color,
                    fontWeight: '600'
                  }}
                >
                  {user.emoji || getAnimalEmoji(user.id)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{user.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
}