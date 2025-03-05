import { MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import type { Block, Board } from "@shared/schema";

interface CommentsOverviewProps {
  board: Board;
  onCommentClick: (block: Block) => void;
}

export function CommentsOverview({ board, onCommentClick }: CommentsOverviewProps) {
  // Get all blocks with comments
  const blocksWithComments = board.blocks.filter(block => block.comments && block.comments.length > 0);
  
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5" />
        <h2 className="font-semibold">Comments</h2>
      </div>

      <ScrollArea className="h-[calc(100vh-12rem)]">
        {blocksWithComments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center">No comments yet</p>
        ) : (
          <div className="space-y-4">
            {blocksWithComments.map(block => (
              <div key={block.id} className="space-y-2">
                <div className="text-sm font-medium">
                  {block.content.slice(0, 50)}{block.content.length > 50 ? '...' : ''}
                </div>
                {block.comments?.map(comment => (
                  <div key={comment.id} className="bg-muted p-2 rounded-md">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-medium">{comment.username}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                ))}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs" 
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
