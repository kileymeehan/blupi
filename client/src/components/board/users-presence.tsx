import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";

interface ConnectedUser {
  id: string;
  name: string;
  color: string;
  emoji?: string;
}

interface UsersPresenceProps {
  users: ConnectedUser[];
  isConnecting?: boolean;
}

const ANIMAL_EMOJIS = ["🦊", "🐼", "🦁", "🐯", "🐨", "🐮", "🐷", "🐸", "🐙", "🦒", "🦘", "🦔", "🦦", "🦥", "🦡"];

function getAnimalEmoji(id: string | number): string {
  const idString = String(id);
  const hash = idString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ANIMAL_EMOJIS[Math.abs(hash) % ANIMAL_EMOJIS.length];
}

export function UsersPresence({ users, isConnecting = false }: UsersPresenceProps) {
  if (isConnecting) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Connecting to collaboration server...</span>
      </div>
    );
  }

  if (!users.length) {
    return (
      <div className="text-sm text-muted-foreground">
        No other users currently online
      </div>
    );
  }

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