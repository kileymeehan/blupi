import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import BoardGrid from "@/components/board/board-grid";
import type { Board, Block, Phase } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { nanoid } from "nanoid";

export default function BoardPage() {
  const { id } = useParams();
  const { toast } = useToast();

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
    <div className="h-screen">
      <BoardGrid
        id={id!}
        onBlocksChange={handleBlocksChange}
        onPhasesChange={handlePhasesChange}
        onBoardChange={handleBoardChange}
      />
    </div>
  );
}