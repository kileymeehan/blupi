import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useFirebaseAuth } from '@/hooks/use-firebase-auth';

type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

interface ConnectedUser {
  id: string;
  name: string;
  color: string;
  emoji?: string;
}

export function useWebSocket(boardId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  const { user } = useFirebaseAuth();
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (!boardId) {
      console.error('[WS] Cannot send message: no boardId provided');
      return;
    }

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WS] Socket not ready, message queued');
      // Attempt to reconnect if not connected
      if (!isConnected) {
        connect();
      }
    }
  }, [boardId, isConnected]);

  const connect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.error('[WS] Max reconnection attempts reached');
      toast({
        title: "Connection Error",
        description: "Failed to connect to server. Please refresh the page.",
        variant: "destructive"
      });
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      console.log('[WS] Connecting to:', wsUrl);

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.addEventListener('open', () => {
        console.log('[WS] Connection established');
        setIsConnected(true);
        reconnectAttempts.current = 0;

        // Send initial subscription
        const userEmail = user?.email || 'Anonymous';
        socket.send(JSON.stringify({
          type: 'subscribe',
          boardId,
          userName: userEmail,
          userEmoji: user?.photoURL
        }));
      });

      socket.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'error') {
            console.error('[WS] Server error:', data.message);
            toast({
              title: "Server Error",
              description: data.message,
              variant: "destructive"
            });
          } else if (data.type === 'users_update') {
            setConnectedUsers(data.users);
          }
          setLastMessage(data);
        } catch (error) {
          console.error('[WS] Message parsing error:', error);
        }
      });

      socket.addEventListener('error', (error) => {
        console.error('[WS] WebSocket error:', error);
        setIsConnected(false);
      });

      socket.addEventListener('close', (event) => {
        console.log('[WS] Connection closed. Code:', event.code);
        setIsConnected(false);

        if (event.code !== 1000) {
          const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;

          console.log(`[WS] Attempting to reconnect in ${backoffTime}ms`);
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          reconnectTimeoutRef.current = setTimeout(() => {
            if (document.visibilityState === 'visible') {
              connect();
            }
          }, backoffTime);
        }
      });

    } catch (error) {
      console.error('[WS] Setup error:', error);
      setIsConnected(false);
    }
  }, [boardId, toast, user?.email, user?.photoURL]);

  // Initialize connection
  useEffect(() => {
    if (!boardId) {
      console.log('[WS] No boardId provided, skipping connection');
      return;
    }

    connect();

    // Handle tab visibility
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected && boardId) {
        console.log('[WS] Tab visible, attempting reconnect');
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmounted');
      }
    };
  }, [boardId, connect]);

  return { isConnected, lastMessage, sendMessage, connectedUsers };
}