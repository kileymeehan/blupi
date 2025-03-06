import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import BoardGrid from "@/components/board/board-grid";
import type { Board, Block, Phase } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";

export default function BoardPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const { sendMessage, connectedUsers } = useWebSocket(Number(id));

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
      queryClient.invalidateQueries({ queryKey: ['/api/boards', id] });

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

  return (
    <BoardGrid
      id={id!}
      onBlocksChange={handleBlocksChange}
      onPhasesChange={handlePhasesChange}
      onBoardChange={handleBoardChange}
      connectedUsers={connectedUsers.map(userId => ({
        id: userId,
        name: userId, // For now using ID as name
        color: '#4F46E5' // Default color
      }))}
    />
  );
}