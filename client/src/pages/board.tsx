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
import { useRef } from "react";

export default function BoardPage() {
  const { id } = useParams();
  const { toast } = useToast();

  const { sendMessage, connectedUsers } = useWebSocket(id || '');

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
      // Update the board's updatedAt timestamp when accessed
      const board = await res.json();
      await apiRequest(
        "PATCH",
        `/api/boards/${id}`,
        { updatedAt: new Date().toISOString() }
      );
      return board;
    },
    refetchInterval: 5000,
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
      queryClient.setQueryData(['/api/boards', id], data);
      sendMessage({
        type: 'board_update',
        board: data
      });
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

  if (isLoading || !board) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <div className="text-lg">Loading project...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-2">{error.message}</div>
          <div className="text-sm text-gray-600">Please wait a moment and try again</div>
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
}