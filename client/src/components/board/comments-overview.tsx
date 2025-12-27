import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import type { Block, Board } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface CommentsOverviewProps {
  board: Board;
  onCommentClick: (block: Block) => void;
}

export function CommentsOverview({ board, onCommentClick }: CommentsOverviewProps) {
  const queryClient = useQueryClient();
  const blocksWithComments = board.blocks.filter(block => block.comments && block.comments.length > 0);

  const toggleCommentCompletion = useMutation({
    mutationFn: async ({ blockId, commentId, completed }: { blockId: string; commentId: string; completed: boolean }) => {
      const response = await fetch(`/api/boards/${board.id}/blocks/${blockId}/comments/${commentId}/toggle`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed }),
      });

      if (!response.ok) {
        throw new Error("Failed to update comment");
      }

      return response.json();
    },
    onSuccess: (updatedBoard) => {
      queryClient.setQueryData(['/api/boards', board.id], updatedBoard);
    },
  });

  return (
    <div className="p-4 h-full">
      <div className="flex items-center mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[#0A0A0F]">All Comments</h2>
      </div>

      <ScrollArea className="h-[calc(100vh-12rem)]">
        {blocksWithComments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center p-3 border-2 border-[#0A0A0F] rounded-none bg-gray-50">No comments yet</p>
        ) : (
          <div className="space-y-4">
            {blocksWithComments.map(block => (
              <div key={block.id} className="space-y-2">
                <div className="text-sm font-semibold text-[#0A0A0F]">
                  {block.content.slice(0, 50)}{block.content.length > 50 ? '...' : ''}
                </div>
                {block.comments?.map(comment => (
                  <div key={comment.id} className="bg-white p-3 border-2 border-[#0A0A0F] rounded-none shadow-[2px_2px_0px_0px_#0A0A0F]">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={comment.completed}
                          onCheckedChange={(checked) => {
                            toggleCommentCompletion.mutate({
                              blockId: block.id,
                              commentId: comment.id,
                              completed: checked as boolean,
                            });
                          }}
                          className="border-2 border-[#0A0A0F] rounded-none data-[state=checked]:bg-[#FFD600] data-[state=checked]:text-[#0A0A0F]"
                        />
                        <span className="text-xs font-bold text-[#0A0A0F]">{comment.username}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm text-[#0A0A0F]">{comment.content}</p>
                  </div>
                ))}
                <Button 
                  size="sm" 
                  className="w-full text-xs bg-white text-[#0A0A0F] border-2 border-[#0A0A0F] rounded-none shadow-[2px_2px_0px_0px_#0A0A0F] hover:bg-[#FFD600] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] font-bold uppercase tracking-wide" 
                  onClick={() => onCommentClick(block)}
                >
                  View All Comments
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}