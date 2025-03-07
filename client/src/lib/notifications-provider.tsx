import { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import type { Notification } from '@/components/notifications/notifications';
import { useFirebaseAuth } from '@/hooks/use-firebase-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface NotificationsContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  clearNotifications: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useFirebaseAuth();
  const { toast } = useToast();

  // Fetch notifications using polling
  useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/notifications');
        if (!res.ok) throw new Error('Failed to fetch notifications');
        const data = await res.json();
        setNotifications(data);
        return data;
      } catch (error) {
        console.error('Error fetching notifications:', error);
        toast({
          title: "Error",
          description: "Failed to fetch notifications",
          variant: "destructive",
        });
        return [];
      }
    },
    refetchInterval: 5000 // Poll every 5 seconds
  });

  // Mutation for marking notifications as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('PATCH', `/api/notifications/${id}/read`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    console.log('Adding new notification:', notification);
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    console.log('Marking notification as read:', id);
    markAsReadMutation.mutate(id);
  }, [markAsReadMutation]);

  const clearNotifications = useCallback(() => {
    console.log('Clearing all notifications');
    setNotifications([]);
  }, []);

  // Clear notifications when user logs out
  if (!user && notifications.length > 0) {
    clearNotifications();
  }

  return (
    <NotificationsContext.Provider value={{
      notifications,
      addNotification,
      markAsRead,
      clearNotifications,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}