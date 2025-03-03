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

  const { data: board, isLoading } = useQuery<Board>({
    queryKey: [`/api/boards/${id}`]
  });

  const updateBoardMutation = useMutation({
    mutationFn: async (updates: Partial<Board>) => {
      const res = await apiRequest("PATCH", `/api/boards/${id}`, updates);
      return res.json();
    },
    onSuccess: (_data, variables, _context) => {
      // Only invalidate the query, don't show toast during drag operations
      if (!variables.blocks && !variables.phases) {
        toast({
          title: "Changes saved",
          description: "Your blueprint has been updated"
        });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${id}`] });
    }
  });

  const handleBlocksChange = (blocks: Block[]) => {
    updateBoardMutation.mutate({ blocks });
  };

  const handlePhasesChange = (phases: Phase[]) => {
    updateBoardMutation.mutate({ phases });
  };

  if (isLoading || !board) {
    return <div className="p-8">Loading...</div>;
  }

  // Initialize phases if they don't exist
  if (!board.phases) {
    handlePhasesChange([{
      id: nanoid(),
      name: 'Phase 1',
      columns: [{
        id: nanoid(),
        name: 'Step 1'
      }]
    }]);
  }

  return (
    <div className="h-screen">
      <BoardGrid
        board={board}
        onBlocksChange={handleBlocksChange}
        onPhasesChange={handlePhasesChange}
      />
    </div>
  );
}