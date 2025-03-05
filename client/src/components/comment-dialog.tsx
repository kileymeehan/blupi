// Previous imports remain the same...

export function CommentDialog({ open, onOpenChange, block, boardId }: CommentDialogProps) {
  const { toast } = useToast();
  const { user } = useFirebaseAuth();
  const queryClient = useQueryClient();

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

  // Rest of the component implementation remains the same...
}
