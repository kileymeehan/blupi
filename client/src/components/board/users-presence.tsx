import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ConnectedUser {
  id: string;
  name: string;
  color: string;
}

interface UsersPresenceProps {
  users: ConnectedUser[];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
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
                  {getInitials(user.name)}
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