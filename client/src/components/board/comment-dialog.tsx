import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-simple-auth";
import { Comment, Block } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";

interface CommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: Block;
  boardId: number;
}

type CommentForm = {
  content: string;
};

export function CommentDialog({ open, onOpenChange, block, boardId }: CommentDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<CommentForm>({
    defaultValues: {
      content: "",
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (data: CommentForm) => {
      const response = await fetch(`/api/boards/${boardId}/blocks/${block.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: data.content,
          username: user?.displayName || "Anonymous"
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Too many requests. Please wait a moment before trying again.");
        }
        const error = await response.json();
        throw new Error(error.message || "Failed to add comment");
      }

      return response.json();
    },
    onMutate: async (newComment) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['/api/boards', boardId] });

      // Get the current board data
      const previousBoard = queryClient.getQueryData(['/api/boards', boardId]);

      // Return context with the optimistic update
      return { previousBoard };
    },
    onError: (error: Error, _, context) => {
      // If there was an error, roll back to the previous value
      if (context?.previousBoard) {
        queryClient.setQueryData(['/api/boards', boardId], context.previousBoard);
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: (updatedBoard) => {
      // Update the cache with the new board data
      queryClient.setQueryData(['/api/boards', boardId], updatedBoard);
      form.reset();
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    },
  });

  const clearCommentsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/boards/${boardId}/blocks/${block.id}/comments/clear`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to clear comments");
      }

      return response.json();
    },
    onSuccess: (updatedBoard) => {
      // Update the cache with the new board data
      queryClient.setQueryData(['/api/boards', boardId], updatedBoard);

      // Also invalidate to ensure we get fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/boards', boardId] });

      toast({
        title: "Success",
        description: "Comments cleared successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CommentForm) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to comment",
        variant: "destructive",
      });
      return;
    }
    addCommentMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Comments</DialogTitle>
            {block.comments && block.comments.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearCommentsMutation.mutate()}
                className="text-red-500 hover:text-red-600"
                disabled={clearCommentsMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="h-[300px] pr-4">
          {block.comments?.map((comment) => (
            <div key={comment.id} className="mb-4 p-3 bg-muted rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium">{comment.username}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
              <p className="text-sm">{comment.content}</p>
            </div>
          ))}

          {(!block.comments || block.comments.length === 0) && (
            <p className="text-center text-muted-foreground">No comments yet</p>
          )}
        </ScrollArea>

        {user ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a comment..."
                          {...field}
                        />
                        <Button
                          type="submit"
                          disabled={addCommentMutation.isPending}
                        >
                          {addCommentMutation.isPending ? "Adding..." : "Add"}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        ) : (
          <div className="text-center text-sm text-muted-foreground">
            Please sign in to add comments
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}