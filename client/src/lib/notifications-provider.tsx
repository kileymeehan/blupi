import React, { createContext, useContext, useState } from "react";

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'comment' | 'invite';
  link?: string;
}

interface NotificationsContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  clearNotifications: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    setNotifications(prev => [
      ...prev,
      {
        ...notification,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        read: false
      }
    ]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationsContext.Provider 
      value={{ 
        notifications, 
        addNotification, 
        markAsRead, 
        clearNotifications 
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}