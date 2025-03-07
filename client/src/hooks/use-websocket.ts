import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

interface ConnectedUser {
  id: string;
  name: string;
  color: string;
}

export function useWebSocket(boardId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
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
    const wsUrl = `${protocol}//${window.location.host}/ws-blupi`;
    console.log('[WS] Connecting to:', wsUrl);

    const connect = () => {
      try {
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.addEventListener('open', () => {
          console.log('[WS] Connection opened');
          setIsConnected(true);
          reconnectAttempts.current = 0;

          // Subscribe to board updates with user info
          const userEmail = localStorage.getItem('userEmail') || 'Anonymous';
          sendMessage({ 
            type: 'subscribe', 
            boardId,
            userName: userEmail 
          });
        });

        socket.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[WS] Received message:', data);

            if (data.type === 'users_update') {
              setConnectedUsers(data.users);
            }
            // Forward board updates to window
            window.postMessage(data, window.location.origin);
            setLastMessage(data);
          } catch (error) {
            console.error('[WS] Message parsing error:', error);
          }
        });

        socket.addEventListener('error', (error) => {
          console.error('[WS] Connection error:', error);
          setIsConnected(false);
          toast({
            title: "Connection Error",
            description: "Failed to connect to collaboration server. Retrying...",
            variant: "destructive"
          });
        });

        socket.addEventListener('close', (event) => {
          console.log(`[WS] Connection closed. Code: ${event.code}, Reason: ${event.reason}`);
          setIsConnected(false);

          if (event.code !== 1000) { // Not a normal closure
            // Exponential backoff for reconnection attempts
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
      } catch (error) {
        console.error('[WS] Failed to create WebSocket connection:', error);
      }
    };

    connect();

    // Handle visibility change to reconnect when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected) {
        console.log('[WS] Tab became visible, attempting to reconnect');
        connect();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('[WS] Cleaning up connection');
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmounted');
      }
    };
  }, [boardId, toast, sendMessage]);

  return { isConnected, lastMessage, sendMessage, connectedUsers };
}