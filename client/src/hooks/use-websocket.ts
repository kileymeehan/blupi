import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useWebSocket(boardId: number) {
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.addEventListener('open', () => {
      // Subscribe to board updates
      sendMessage({ type: 'subscribe', boardId });
    });

    socket.addEventListener('error', () => {
      toast({
        title: "Connection Error",
        description: "Failed to connect to collaboration server",
        variant: "destructive",
      });
    });

    return () => {
      socket.close();
    };
  }, [boardId, toast, sendMessage]);

  return { sendMessage };
}
