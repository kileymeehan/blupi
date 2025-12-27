import { useState } from 'react';
import { Bell, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow, format } from 'date-fns';

interface SimpleNotification {
  id: string;
  toUserId: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  readAt?: string | null;
  meta?: any;
  actionUrl?: string;
}

export function NotificationBell({ variant = 'auto' }: { variant?: 'light' | 'dark' | 'auto' }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery<SimpleNotification[]>({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const response = await fetch('/api/notifications', {
        credentials: 'include',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      return response.json();
    },
    staleTime: 0,
    gcTime: 0
  });

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/count'],
    queryFn: async () => {
      const response = await fetch('/api/notifications/count', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch notification count');
      }
      return response.json();
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      fetch(`/api/notifications/${notificationId}/read`, { 
        method: 'PATCH',
        credentials: 'include'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () =>
      fetch('/api/notifications/mark-all-read', { 
        method: 'PATCH',
        credentials: 'include'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count'] });
    },
  });

  const unreadCount = countData?.count || 0;

  // Determine icon color based on variant
  const getIconColor = () => {
    if (variant === 'light') return 'text-white/90 hover:text-white';
    if (variant === 'dark') return 'text-white';
    // Auto mode: white by default (for dark backgrounds), can be overridden by parent context
    return 'text-white';
  };

  const handleNotificationClick = (notification: SimpleNotification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else {
      return format(date, 'MMM d, yyyy • h:mm a');
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-white/10">
          <Bell className={`h-5 w-5 ${getIconColor()}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 border-2 border-[#0A0A0F] rounded-none shadow-[4px_4px_0px_0px_#0A0A0F]" align="end">
        <div className="flex items-center justify-between p-4 border-b-2 border-[#0A0A0F] bg-[#0A0A0F]">
          <h3 className="font-bold text-white uppercase tracking-wide text-sm">Notifications</h3>
          <Button
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending || unreadCount === 0}
            className="text-xs bg-white text-[#0A0A0F] border border-[#0A0A0F] rounded-none hover:bg-[#FFD600] font-bold uppercase tracking-wide"
          >
            Mark all read
          </Button>
        </div>
        
        <ScrollArea className="h-96 bg-white">
          {notifications && notifications.length > 0 ? (
            notifications.map((notification: SimpleNotification) => (
              <div
                key={notification.id}
                className={`p-4 border-b-2 border-[#0A0A0F] cursor-pointer hover:bg-[#FFD600] transition-all duration-200 ${
                  !notification.read ? 'bg-[#E3F2FD] border-l-4 border-l-[#1976D2]' : 'bg-white'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className={`font-bold text-sm uppercase tracking-wide ${!notification.read ? 'text-[#1976D2]' : 'text-[#0A0A0F]'}`}>
                    {notification.title}
                  </h4>
                  {!notification.read && (
                    <div className="h-2 w-2 bg-[#1976D2] rounded-none flex-shrink-0 ml-2 mt-1" />
                  )}
                </div>
                <p className="text-sm text-[#0A0A0F] mb-3 leading-relaxed">{notification.message}</p>
                <div className="flex items-center text-xs text-gray-500 font-medium">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatNotificationTime(notification.createdAt)}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-[#0A0A0F] text-sm">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <span className="font-semibold">No notifications</span>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}