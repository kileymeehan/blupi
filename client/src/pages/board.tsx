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
    onSuccess: (_data, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${id}`] });
      // Only show toast if not a drag operation and not silenced
      if (!context?.silentUpdate) {
        toast({
          title: "Changes saved",
          description: "Your blueprint has been updated"
        });
      }
    }
  });

  const handleBlocksChange = (blocks: Block[]) => {
    updateBoardMutation.mutate({ blocks }, { context: { silentUpdate: true } });
  };

  const handlePhasesChange = (phases: Phase[]) => {
    updateBoardMutation.mutate({ phases }, { context: { silentUpdate: true } });
  };

  if (isLoading || !board) {
    return <div className="p-8">Loading...</div>;
  }

  // Initialize phases if they don't exist
  if (!board.phases) {
    handlePhasesChange([{
      id: nanoid(),
      name: 'Step 1',
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