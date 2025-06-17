import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Comment, Block } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { z } from "zod";

const commentSchema = z.object({
  content: z.string().min(1, "Comment content is required"),
});

type CommentForm = z.infer<typeof commentSchema>;

interface CommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: Block;
  boardId: string;
}

export function CommentDialog({ open, onOpenChange, block, boardId }: CommentDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<CommentForm>({
    resolver: zodResolver(commentSchema),
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
          userId: user?.uid,
          authorName: user?.displayName || user?.email || "Anonymous",
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      return response.json();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: (updatedBoard) => {
      queryClient.setQueryData(['/api/boards', boardId], updatedBoard);
      form.reset();
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    },
  });

  const onSubmit = (data: CommentForm) => {
    addCommentMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Comments for "{block.content}"</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <ScrollArea className="h-48 border rounded p-2">
            {block.comments?.length ? (
              <div className="space-y-2">
                {block.comments.map((comment: Comment) => (
                  <div key={comment.id} className="p-2 border rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">{comment.authorName}</p>
                        <p className="text-sm text-muted-foreground">{comment.content}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No comments yet</p>
            )}
          </ScrollArea>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Add a comment..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                disabled={addCommentMutation.isPending}
                className="w-full"
              >
                {addCommentMutation.isPending ? "Adding..." : "Add Comment"}
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}