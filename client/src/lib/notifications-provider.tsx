import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';
import type { Notification } from '@/components/notifications/notifications';
import { useFirebaseAuth } from '@/hooks/use-firebase-auth';
import { useWebSocket } from '@/hooks/use-websocket';

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
  const { sendMessage } = useWebSocket(0); 

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
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  }, []);

  const clearNotifications = useCallback(() => {
    console.log('Clearing all notifications');
    setNotifications([]);
  }, []);

  useEffect(() => {
    if (!user) {
      clearNotifications();
    }
  }, [user, clearNotifications]);

  // Listen for WebSocket notifications
  useEffect(() => {
    console.log('Setting up notifications listener');

    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Notifications received message:', data);
        if (data.type === 'notification') {
          console.log('Processing notification:', data.notification);
          addNotification(data.notification);
        }
      } catch (error) {
        console.error('Error processing notification message:', error);
      }
    };

    // Add message listener to window for WebSocket messages
    window.addEventListener('message', handleWebSocketMessage);

    return () => {
      console.log('Cleaning up notifications listener');
      window.removeEventListener('message', handleWebSocketMessage);
    };
  }, [addNotification]);

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