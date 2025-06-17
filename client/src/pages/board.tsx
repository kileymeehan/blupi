import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import BoardGrid from "@/components/board/board-grid";
import type { Board, Block, Phase } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
import { Loader2 } from "lucide-react";
import { withErrorBoundary } from "@/components/error-boundary";
import { useRef, useEffect } from "react";

export default function BoardPage() {
  const { id } = useParams();
  const { toast } = useToast();

  const { sendMessage, connectedUsers, lastMessage } = useWebSocket(id || '');

  // Listen for incoming board updates via WebSocket for real-time collaboration
  useEffect(() => {
    console.log('[BoardPage] WebSocket message received:', lastMessage?.type);
    if (lastMessage?.type === 'board_update' && lastMessage.board) {
      console.log('[BoardPage] Processing real-time board update:', lastMessage.board.id);
      // Immediately update the local cache with incoming changes
      queryClient.setQueryData(['/api/boards', id], lastMessage.board);
    }
  }, [lastMessage, id]);

  const { data: board, isLoading, error } = useQuery({
    queryKey: ['/api/boards', id],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${id}`);
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("Too many requests. Please wait a moment before trying again.");
        }
        throw new Error('Failed to fetch board');
      }
      const board = await res.json();
      return board;
    },
    refetchInterval: 60000, // Reduced from 5s to 60s
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("Too many requests")) {
        return false;
      }
      return failureCount < 3;
    },
    gcTime: 1000 * 60 * 5,
  });

  const { data: project } = useQuery({
    queryKey: ['/api/projects', board?.projectId],
    queryFn: async () => {
      if (!board?.projectId) return null;
      const res = await fetch(`/api/projects/${board.projectId}`);
      if (!res.ok) throw new Error('Failed to fetch project');
      return res.json();
    },
    enabled: !!board?.projectId,
  });

  const updateBoardMutation = useMutation({
    mutationFn: async (updates: Partial<Board>) => {
      // Ensure dates are properly serialized
      const sanitizedUpdates = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const res = await apiRequest(
        "PATCH",
        `/api/boards/${id}`,
        sanitizedUpdates
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to update board');
      }

      return res.json();
    },
    onSuccess: (data) => {
      // Immediate local update for responsiveness
      queryClient.setQueryData(['/api/boards', id], data);
      
      // Broadcast changes immediately via WebSocket
      sendMessage({
        type: 'board_update',
        board: data,
        timestamp: Date.now()
      });
      
      // Invalidate cache to ensure fresh data on next fetch
      queryClient.invalidateQueries({ queryKey: ['/api/boards', id] });
    },
    onError: (error: Error) => {
      console.error('Board update error:', error);
      toast({
        title: "Error saving changes",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Debug logging to help identify the issue
  console.log('Board page render:', { id, isLoading, board: !!board, error });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <div className="text-lg">Loading board...</div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Board error:', error);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-2">{error.message}</div>
          <div className="text-sm text-gray-600">Please wait a moment and try again</div>
        </div>
      </div>
    );
  }

  if (!board) {
    console.warn('Board data is missing');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="text-lg text-red-600">Board not found</div>
          <div className="text-sm text-gray-600">The board you're looking for doesn't exist or couldn't be loaded.</div>
        </div>
      </div>
    );
  }

  const handleBlocksChange = (blocks: Block[]) => {
    updateBoardMutation.mutate({ blocks });
  };

  const handlePhasesChange = (phases: Phase[]) => {
    updateBoardMutation.mutate({ phases });
  };

  const handleBoardChange = (updates: Partial<Board>) => {
    updateBoardMutation.mutate(updates);
  };

  try {
    console.log('Rendering BoardGrid with:', { 
      id, 
      boardId: board.id, 
      boardName: board.name,
      blocksCount: board.blocks?.length || 0,
      phasesCount: board.phases?.length || 0,
      projectId: board.projectId 
    });

    return (
      <BoardGrid
        id={id!}
        board={board}
        onBlocksChange={handleBlocksChange}
        onPhasesChange={handlePhasesChange}
        onBoardChange={handleBoardChange}
        connectedUsers={connectedUsers}
        project={project}
      />
    );
  } catch (error) {
    console.error('Error rendering BoardGrid:', error);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="text-lg text-red-600">Error loading board</div>
          <div className="text-sm text-gray-600">There was a problem rendering this board. Please try refreshing the page.</div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
}