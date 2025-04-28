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
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const { toast } = useToast();
  const { user } = useFirebaseAuth();

  const MAX_RETRY_ATTEMPTS = 5;
  const INITIAL_RETRY_DELAY = 500; // Start with a shorter delay (500ms)

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

    // Use a simpler, more reliable WebSocket URL construction that works with Replit
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
            userEmoji: user?.photoURL
          });
        });

        socket.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[WS] Received message:', data);

            if (data.type === 'users_update') {
              setConnectedUsers(data.users);
            }
            setLastMessage(data);
          } catch (error) {
            console.error('[WS] Message parsing error:', error);
          }
        });

        socket.addEventListener('error', (error) => {
          console.log('[WS] Connection error - this is expected during development and usually safe to ignore');
          setIsConnected(false);
        });

        socket.addEventListener('close', (event) => {
          console.log(`[WS] Connection closed. Code: ${event.code}, Reason: ${event.reason}`);
          setIsConnected(false);
          setIsConnecting(false);

          if (event.code !== 1000) {
            const backoffTime = Math.min(
              INITIAL_RETRY_DELAY * Math.pow(1.5, reconnectAttempts.current), // Use 1.5 instead of 2 for gentler backoff
              10000 // Cap at 10 seconds instead of 30
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