import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-simple-auth';

type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

export interface ConnectedUser {
  id: string;
  name: string;
  color: string;
  emoji?: string;
  photoURL?: string;
}

// These skip React state and go straight to subscribers: cursors and focus
// arrive many times a second and shouldn't re-render the board
const PRESENCE_TYPES = new Set(['cursor', 'focus', 'left', 'welcome', 'board_changed']);

export type PresenceListener = (message: WebSocketMessage) => void;

export interface Collaboration {
  send: (message: WebSocketMessage) => void;
  subscribe: (listener: PresenceListener) => () => void;
  // This tab's connection, sent with saves so the server doesn't echo them back
  getConnectionId: () => string | null;
}

export function useWebSocket(boardId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef(new Set<PresenceListener>());
  const connectionIdRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const { toast } = useToast();
  const { user } = useAuth();

  const MAX_RETRY_ATTEMPTS = 5;
  const INITIAL_RETRY_DELAY = 100; // Faster initial retry for real-time feel

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  const subscribe = useCallback((listener: PresenceListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    // The server identifies us from the session cookie, so wait for sign-in
    if (!boardId || !user) return;

    // Clean up any existing connection when board changes
    if (socketRef.current) {
      socketRef.current.close(1000, 'Board navigation');
      socketRef.current = null;
      setIsConnected(false);
      setIsConnecting(false);
      setConnectedUsers([]);
    }

    // Clear any pending reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    reconnectAttempts.current = 0;

    // Reconnect after a profile change so others see the new avatar
    const handleProfileUpdate = () => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.close(4000, 'Profile updated');
      }
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate as EventListener);

    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${wsProtocol}://${window.location.host}/ws`;

    const connect = () => {
      try {
        setIsConnecting(true);
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.addEventListener('open', () => {
          setIsConnected(true);
          setIsConnecting(false);
          reconnectAttempts.current = 0;
          sendMessage({ type: 'subscribe', boardId });
        });

        socket.addEventListener('message', (event) => {
          let data: WebSocketMessage;
          try {
            data = JSON.parse(event.data);
          } catch (error) {
            console.error('[WS] Message parsing error:', error);
            return;
          }

          if (data.type === 'welcome') connectionIdRef.current = data.connectionId;
          if (PRESENCE_TYPES.has(data.type)) {
            listenersRef.current.forEach((listener) => listener(data));
            return;
          }
          if (data.type === 'users_update') {
            setConnectedUsers(data.users);
          }
          setLastMessage(data);
        });

        socket.addEventListener('error', () => {
          setIsConnected(false);
          setIsConnecting(false);
        });

        socket.addEventListener('close', (event) => {
          setIsConnected(false);
          setIsConnecting(false);
          if (socketRef.current === socket) {
            setConnectedUsers([]);
            connectionIdRef.current = null;
          }

          // 1000 = we closed it on purpose; 4401 = not signed in, retrying won't help
          if (event.code === 1000 || event.code === 4401) return;

          const backoffTime = Math.min(
            INITIAL_RETRY_DELAY * Math.pow(1.2, reconnectAttempts.current),
            2000
          );
          reconnectAttempts.current++;

          if (reconnectAttempts.current <= MAX_RETRY_ATTEMPTS) {
            reconnectTimeoutRef.current = setTimeout(() => {
              if (document.visibilityState === 'visible') {
                connect();
              }
            }, backoffTime);
          } else {
            toast({
              title: "Connection Failed",
              description: "Unable to establish a stable connection. Please check your internet connection and refresh the page.",
              variant: "destructive"
            });
          }
        });
      } catch (error) {
        setIsConnecting(false);
      }
    };

    connect();

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        socketRef.current?.readyState !== WebSocket.OPEN &&
        socketRef.current?.readyState !== WebSocket.CONNECTING
      ) {
        reconnectAttempts.current = 0;
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('userProfileUpdated', handleProfileUpdate as EventListener);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmounted');
        socketRef.current = null;
      }
    };
  }, [boardId, toast, sendMessage, user?.uid]);

  const collaboration = useMemo<Collaboration>(
    () => ({ send: sendMessage, subscribe, getConnectionId: () => connectionIdRef.current }),
    [sendMessage, subscribe]
  );

  return { isConnected, isConnecting, lastMessage, sendMessage, connectedUsers, collaboration };
}
