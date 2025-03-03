import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import BoardGrid from "@/components/board/board-grid";
import type { Board, Block } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

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
      // Only show toast if not silenced
      if (!context?.silent) {
        toast({
          title: "Changes saved",
          description: "Your blueprint has been updated"
        });
      }
    }
  });

  const handleBlocksChange = (blocks: Block[], options = { silent: false }) => {
    updateBoardMutation.mutate({ blocks }, { context: options });
  };

  const handleAddColumn = () => {
    if (!board) return;
    updateBoardMutation.mutate({ 
      numColumns: board.numColumns + 1,
      blocks: [...board.blocks]
    });
  };

  const handleRemoveColumn = (index: number) => {
    if (!board) return;
    updateBoardMutation.mutate({
      numColumns: board.numColumns - 1,
      blocks: board.blocks.filter(b => b.columnIndex !== index)
        .map(b => b.columnIndex > index ? 
          {...b, columnIndex: b.columnIndex - 1} : b
        )
    });
  };

  if (isLoading || !board) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">{board.name}</h1>
      <BoardGrid
        board={board}
        onBlocksChange={handleBlocksChange}
        onAddColumn={handleAddColumn}
        onRemoveColumn={handleRemoveColumn}
      />
    </div>
  );
}