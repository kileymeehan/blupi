import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { insertBoardSchema, type InsertBoard } from "@shared/schema";
import { nanoid } from 'nanoid';

interface CreateBlueprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: number;
}

export function CreateBlueprintDialog({ open, onOpenChange, projectId }: CreateBlueprintDialogProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const form = useForm<InsertBoard>({
    resolver: zodResolver(insertBoardSchema),
    defaultValues: {
      name: "",
      description: "",
      blocks: [],
      status: "draft",
      phases: [{
        id: nanoid(),
        name: 'Phase 1',
        columns: [{
          id: nanoid(),
          name: 'Step 1',
          image: undefined
        }]
      }],
      projectId: projectId || undefined
    },
  });

  const createBlueprint = useMutation({
    mutationFn: async (data: InsertBoard) => {
      const response = await fetch("/api/boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          projectId: projectId || null
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.message?.includes("session format is outdated")) {
          throw new Error("Your account session is outdated. Please sign out and create a new account to continue.");
        }
        throw new Error(error.message || "Failed to create blueprint");
      }

      return response.json();
    },
    onSuccess: async (data) => {
      // Invalidate all boards queries to ensure the new blueprint appears
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      
      // Also invalidate project-specific queries if this is tied to a project
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'boards'] });
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      }

      onOpenChange(false);
      form.reset();

      toast({
        title: "Success",
        description: "Blueprint created successfully",
      });

      navigate(`/board/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertBoard) => {
    createBlueprint.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-[#302E87] text-xl font-semibold">Create New Blueprint</DialogTitle>
          <DialogDescription className="text-[#6B6B97]">
            Create a new blueprint to design your workflow
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#302E87]">Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter blueprint name" 
                      className="border-[#A1D9F5] focus-visible:ring-[#302E87]/30 placeholder:text-[#6B6B97]/50" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#302E87]">Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter blueprint description (optional)"
                      value={field.value || ''}
                      onChange={field.onChange}
                      className="border-[#A1D9F5] focus-visible:ring-[#302E87]/30 placeholder:text-[#6B6B97]/50"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createBlueprint.isPending}
                className="border-[#A1D9F5] text-[#302E87] hover:bg-[#FFE8D6]/20 hover:border-[#302E87]"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createBlueprint.isPending}
                className="bg-[#302E87] hover:bg-[#252270] text-white"
              >
                {createBlueprint.isPending ? "Creating..." : "Create Blueprint"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}