import { useEffect, useRef, useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface ConnectedUser {
  id: string;
  name: string;
  color: string;
}

export function useWebSocket(boardId: number) {
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('WS Sending message:', message);
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WS Not ready, message not sent:', message);
    }
  }, []);

  useEffect(() => {
    console.log(`WS Initializing connection for board ${boardId}`);
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws-blupi`; 
    console.log('WS Connecting to:', wsUrl);

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.addEventListener('open', () => {
      console.log('WS Connection opened');
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
        console.log('WS Received message:', data);
        if (data.type === 'users_update') {
          setConnectedUsers(data.users);
        }
      } catch (error) {
        console.error('WS Message parsing error:', error);
      }
    });

    socket.addEventListener('error', (error) => {
      console.error('WS Error occurred:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to collaboration server",
        variant: "destructive"
      });
    });

    socket.addEventListener('close', (event) => {
      console.log(`WS Connection closed. Code: ${event.code}, Reason: ${event.reason}`);
    });

    return () => {
      console.log('WS Cleaning up connection');
      socket.close();
    };
  }, [boardId, toast, sendMessage]);

  return { sendMessage, connectedUsers };
}