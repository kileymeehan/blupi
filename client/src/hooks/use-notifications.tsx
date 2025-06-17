import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-simple-auth";
import { Notification } from "@shared/schema";

export function useNotifications(unreadOnly: boolean = false) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: notifications = [],
    isLoading,
    error
  } = useQuery<Notification[]>({
    queryKey: ['/api/notifications', user?.uid, unreadOnly],
    queryFn: async () => {
      if (!user?.uid) return [];
      const response = await fetch(`/api/notifications?userId=${user.uid}&unreadOnly=${unreadOnly}`);
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      return response.json();
    },
    enabled: !!user?.uid,
    refetchInterval: 300000 // Refresh every 5 minutes
  });

  const {
    data: unreadCountData
  } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/count', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return { count: 0 };
      const response = await fetch(`/api/notifications/count?userId=${user.uid}`);
      if (!response.ok) {
        throw new Error('Failed to fetch notification count');
      }
      return response.json();
    },
    enabled: !!user?.uid,
    refetchInterval: 300000 // Refresh every 5 minutes
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.uid) throw new Error('User not authenticated');
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid })
      });
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/notifications', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count', user?.uid] });
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.uid) throw new Error('User not authenticated');
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid })
      });
      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/notifications', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count', user?.uid] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.uid) throw new Error('User not authenticated');
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid })
      });
      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/notifications', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/count', user?.uid] });
    }
  });

  return {
    notifications,
    unreadCount: unreadCountData?.count || 0,
    isLoading,
    error,
    markAsRead: markAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isDeleting: deleteNotificationMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending
  };
}