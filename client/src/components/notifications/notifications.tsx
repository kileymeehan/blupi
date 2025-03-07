import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'comment' | 'invite';
  link?: string;
}

interface NotificationsProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
}

export function Notifications({ notifications, onMarkAsRead }: NotificationsProps) {
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="relative h-9 w-9 p-0"
        onClick={() => setOpen(true)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Notifications</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
            <div className="space-y-4">
              {notifications.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No notifications yet
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`
                      p-4 rounded-lg border 
                      ${notification.read ? 'bg-background' : 'bg-primary/5 border-primary/20'}
                      cursor-pointer hover:bg-accent
                      transition-colors
                    `}
                    onClick={() => {
                      if (!notification.read) {
                        onMarkAsRead(notification.id);
                      }
                      if (notification.link) {
                        window.location.href = notification.link;
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium">{notification.title}</h4>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(notification.timestamp), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}