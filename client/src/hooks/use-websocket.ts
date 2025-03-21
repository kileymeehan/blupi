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

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('[WS] Sending message:', message);
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WS] Socket not ready (state:', socketRef.current?.readyState, '), message not sent:', message);
    }
  }, []);

  useEffect(() => {
    console.log(`[WS] Initializing connection for board ${boardId}`);
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws-collab`; // Updated path
    console.log('[WS] Connecting to:', wsUrl);

    const connect = () => {
      try {
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.addEventListener('open', () => {
          console.log('[WS] Connection opened successfully');
          setIsConnected(true);
          reconnectAttempts.current = 0;

          // Subscribe to board updates with user info
          const userEmail = user?.email || 'Anonymous';
          console.log('[WS] Subscribing with user info:', {
            email: userEmail,
            emoji: user?.photoURL
          });

          sendMessage({
            type: 'subscribe',
            boardId,
            userName: userEmail,
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
            window.postMessage(data, window.location.origin);
            setLastMessage(data);
          } catch (error) {
            console.error('[WS] Message parsing error:', error);
          }
        });

        socket.addEventListener('error', (error) => {
          console.error('[WS] Connection error:', error);
          setIsConnected(false);
        });

        socket.addEventListener('close', (event) => {
          console.log(`[WS] Connection closed. Code: ${event.code}, Reason: ${event.reason}`);
          setIsConnected(false);

          if (event.code !== 1000) { // Not a normal closure
            const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
            reconnectAttempts.current++;

            console.log(`[WS] Attempting to reconnect in ${backoffTime}ms (attempt ${reconnectAttempts.current})`);
            reconnectTimeoutRef.current = setTimeout(() => {
              if (document.visibilityState === 'visible') {
                connect();
              }
            }, backoffTime);
          }
        });

        return () => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.close(1000, 'Component unmounted');
          }
        };
      } catch (error) {
        console.error('[WS] Failed to create WebSocket connection:', error);
      }
    };

    if (boardId) {
      connect();
    }

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
  }, [boardId, sendMessage, user?.email, user?.photoURL]);

  return { isConnected, lastMessage, sendMessage, connectedUsers };
}