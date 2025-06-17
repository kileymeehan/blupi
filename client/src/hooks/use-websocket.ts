import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-simple-auth';

type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

interface ConnectedUser {
  id: string;
  name: string;
  color: string;
  emoji?: string;
  photoURL?: string;
}

export function useWebSocket(boardId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const { toast } = useToast();
  const { user } = useAuth();

  const MAX_RETRY_ATTEMPTS = 5;
  const INITIAL_RETRY_DELAY = 100; // Faster initial retry for real-time feel

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('[WS] Sending message:', message);
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WS] Socket not ready, message not sent:', message);
    }
  }, []);

  useEffect(() => {
    if (!boardId) return;

    // Clean up any existing connection when board changes
    if (socketRef.current) {
      console.log('[WS] Board changed, closing existing connection');
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

    // Listen for profile updates to reconnect with new emoji
    const handleProfileUpdate = (event: CustomEvent) => {
      console.log('[WS] Profile updated, reconnecting with new emoji:', event.detail.photoURL);
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.close(1000, 'Profile updated');
      }
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate as EventListener);

    // Construct WebSocket URL with proper protocol detection
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${wsProtocol}://${window.location.host}/ws`;

    console.log('[WS] Attempting to connect to:', wsUrl);

    const connect = () => {
      try {
        setIsConnecting(true);
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.addEventListener('open', () => {
          console.log('[WS] Connection opened');
          setIsConnected(true);
          setIsConnecting(false);
          reconnectAttempts.current = 0;

          sendMessage({
            type: 'subscribe',
            boardId,
            userName: user?.email || 'Anonymous',
            userEmoji: user?.photoURL || '👤',
            userPhotoURL: (user?.photoURL && user.photoURL.length > 1) ? user.photoURL : undefined
          });
        });

        socket.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[WS] Received message:', data.type, data.timestamp ? `(${Date.now() - data.timestamp}ms delay)` : '');

            if (data.type === 'users_update') {
              setConnectedUsers(data.users);
            }
            setLastMessage(data);
          } catch (error) {
            console.error('[WS] Message parsing error:', error);
          }
        });

        socket.addEventListener('error', (error) => {
          console.error('[WS] Connection error:', error);
          setIsConnected(false);
          setIsConnecting(false);
        });

        socket.addEventListener('close', (event) => {
          console.log(`[WS] Connection closed. Code: ${event.code}, Reason: ${event.reason}`);
          setIsConnected(false);
          setIsConnecting(false);

          if (event.code !== 1000) {
            const backoffTime = Math.min(
              INITIAL_RETRY_DELAY * Math.pow(1.2, reconnectAttempts.current), // Faster reconnection
              2000 // Cap at 2 seconds for faster real-time updates
            );
            reconnectAttempts.current++;

            if (reconnectAttempts.current <= MAX_RETRY_ATTEMPTS) {
              console.log(`[WS] Attempting to reconnect in ${backoffTime}ms (attempt ${reconnectAttempts.current}/${MAX_RETRY_ATTEMPTS})`);
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
          }
        });

        return () => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.close(1000, 'Component unmounted');
          }
        };
      } catch (error) {
        console.log('[WS] WebSocket connection not established - this is expected in development and usually safe to ignore');
        setIsConnecting(false);
      }
    };

    connect();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected && boardId) {
        console.log('[WS] Tab became visible, attempting to reconnect');
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
      }
    };
  }, [boardId, toast, sendMessage, user?.email, user?.photoURL]);

  return { isConnected, isConnecting, lastMessage, sendMessage, connectedUsers };
}