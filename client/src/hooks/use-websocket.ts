import { useEffect, useRef, useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useFirebaseAuth } from '@/hooks/use-firebase-auth';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface ConnectedUser {
  id: string;
  name: string;
  color: string;
  photoURL?: string;
}

export function useWebSocket(boardId: number) {
  const socketRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  const { user } = useFirebaseAuth();
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);

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
      // Subscribe to board updates with user info including photoURL
      sendMessage({ 
        type: 'subscribe', 
        boardId,
        userName: user?.email || 'Anonymous',
        photoURL: user?.photoURL
      });

      console.log('WebSocket connected, sending user data:', {
        email: user?.email,
        photoURL: user?.photoURL
      });
    });

    socket.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'users_update') {
        console.log('Received users update:', data.users);
        setConnectedUsers(data.users);
      }
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
  }, [boardId, toast, sendMessage, user]);

  return { sendMessage, connectedUsers };
}