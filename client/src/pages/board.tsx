import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import BoardGrid from "@/components/board/board-grid";
import type { Board, Block, Phase } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
import { Loader2 } from "lucide-react";

export default function BoardPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const { sendMessage, connectedUsers } = useWebSocket(Number(id));

  const { data: board, isLoading, error } = useQuery({
    queryKey: ['/api/boards', id],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${id}`);
      if (!res.ok) throw new Error('Failed to fetch board');
      return res.json();
    },
    retry: 3,
    retryDelay: 1000,
  });

  const updateBoardMutation = useMutation({
    mutationFn: async (updates: Partial<Board>) => {
      const res = await apiRequest("PATCH", `/api/boards/${id}`, updates);
      return res.json();
    },
    onSuccess: (data, variables) => {
      // Only show toast for non-frequent updates (like name changes)
      if (!variables.blocks && !variables.phases) {
        toast({
          title: "Changes saved",
          description: "Your blueprint has been updated"
        });
      }
      queryClient.setQueryData(['/api/boards', id], data);

      // Broadcast changes to other users
      sendMessage({
        type: 'board_update',
        board: data
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving changes",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleBlocksChange = (blocks: Block[]) => {
    updateBoardMutation.mutate({ blocks });
  };

  const handlePhasesChange = (phases: Phase[]) => {
    updateBoardMutation.mutate({ phases });
  };

  const handleBoardChange = (updates: Partial<Board>) => {
    updateBoardMutation.mutate(updates);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-2">Failed to load blueprint</div>
          <div className="text-sm text-gray-600">Please try again later</div>
        </div>
      </div>
    );
  }

  return (
    <BoardGrid
      id={id!}
      onBlocksChange={handleBlocksChange}
      onPhasesChange={handlePhasesChange}
      onBoardChange={handleBoardChange}
      connectedUsers={connectedUsers.map(userId => ({
        id: userId,
        name: userId,
        color: '#4F46E5'
      }))}
    />
  );
}