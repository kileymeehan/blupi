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
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium">Notifications</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending || unreadCount === 0}
            className="text-xs"
          >
            Mark all read
          </Button>
        </div>
        
        <ScrollArea className="h-96">
          {notifications && notifications.length > 0 ? (
            notifications.map((notification: SimpleNotification) => (
              <div
                key={notification.id}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-all duration-200 ${
                  !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className={`font-medium text-sm ${!notification.read ? 'text-blue-900' : 'text-gray-900'}`}>
                    {notification.title}
                  </h4>
                  {!notification.read && (
                    <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 ml-2 mt-1" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">{notification.message}</p>
                <div className="flex items-center text-xs text-gray-400">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatNotificationTime(notification.createdAt)}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500 text-sm">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              No notifications
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}