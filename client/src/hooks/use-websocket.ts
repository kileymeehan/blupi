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
    if (socketRef.current && user?.photoURL) {
      console.log('[WS] User profile updated, reconnecting...');
      socketRef.current.close(1000, 'User profile updated');
    }
  }, [user?.photoURL]);

  useEffect(() => {
    console.log(`[WS] Initializing connection for board ${boardId}`);
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;
    console.log('[WS] Connecting to:', wsUrl);

    const connect = () => {
      try {
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.addEventListener('open', () => {
          console.log('[WS] Connection opened');
          setIsConnected(true);
          reconnectAttempts.current = 0;

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

        const handleProfileUpdate = (event: CustomEvent) => {
          if (socket.readyState === WebSocket.OPEN) {
            sendMessage({
              type: 'subscribe',
              boardId,
              userName: user?.email || 'Anonymous',
              userEmoji: event.detail.photoURL
            });
          }
        };

        window.addEventListener('userProfileUpdated', handleProfileUpdate as EventListener);

        return () => {
          window.removeEventListener('userProfileUpdated', handleProfileUpdate as EventListener);
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
  }, [boardId, toast, sendMessage, user, user?.photoURL]); 

  return { isConnected, lastMessage, sendMessage, connectedUsers };
}