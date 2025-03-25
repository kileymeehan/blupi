import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ConnectedUser {
  id: string;
  name: string;
  color: string;
}

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useWebSocket(boardId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!boardId) {
      console.log('[WS] No boardId provided, skipping connection');
      return;
    }

    // Create WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    console.log('[WS] Connecting to:', wsUrl);

    try {
      // Create WebSocket connection
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      // Connection opened
      socket.addEventListener('open', () => {
        console.log('[WS] Connection established');
        setIsConnected(true);

        // Send subscription message
        const subscribeMessage = {
          type: 'subscribe',
          boardId,
          userName: 'Test User' // For testing
        };

        console.log('[WS] Sending subscribe message:', subscribeMessage);
        socket.send(JSON.stringify(subscribeMessage));
      });

      // Listen for messages
      socket.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WS] Received message:', data);

          switch (data.type) {
            case 'connected':
              console.log('[WS] Connection confirmed, userId:', data.userId);
              break;
            case 'users_update':
              console.log('[WS] Users updated:', data.users);
              setConnectedUsers(data.users);
              break;
            case 'error':
              console.error('[WS] Server error:', data.message);
              toast({
                title: "WebSocket Error",
                description: data.message,
                variant: "destructive"
              });
              break;
            default:
              console.log('[WS] Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('[WS] Error processing message:', error);
        }
      });

      // Connection error
      socket.addEventListener('error', (error) => {
        console.error('[WS] WebSocket error:', error);
        setIsConnected(false);
        toast({
          title: "Connection Error",
          description: "Failed to connect to server. Please try refreshing the page.",
          variant: "destructive"
        });
      });

      // Connection closed
      socket.addEventListener('close', (event) => {
        console.log('[WS] Connection closed. Code:', event.code);
        setIsConnected(false);
        setConnectedUsers([]);
      });

      // Cleanup on unmount
      return () => {
        console.log('[WS] Cleaning up WebSocket connection');
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.close(1000, 'Component unmounted');
        }
      };
    } catch (error) {
      console.error('[WS] Setup error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to establish WebSocket connection",
        variant: "destructive"
      });
    }
  }, [boardId, toast]);

  const sendMessage = (message: WebSocketMessage) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[WS] Cannot send message - socket not ready');
      return;
    }

    try {
      socketRef.current.send(JSON.stringify(message));
    } catch (error) {
      console.error('[WS] Error sending message:', error);
    }
  };

  return {
    isConnected,
    connectedUsers,
    sendMessage
  };
}