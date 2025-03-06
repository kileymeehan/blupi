import { useState } from "react";
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
      projectId: projectId || null
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
        throw new Error(error.message || "Failed to create blueprint");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Update the boards cache
      queryClient.setQueryData(['/api/boards'], (oldData: any[] = []) => [...oldData, data]);

      // Also update project's boards if projectId exists
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/boards', { projectId }] });
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      }

      toast({
        title: "Success",
        description: "Blueprint created successfully",
      });

      onOpenChange(false);
      form.reset();

      // Add a small delay before navigation to ensure state updates are complete
      setTimeout(() => {
        navigate(`/board/${data.id}`);
      }, 100);
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
          <DialogTitle>Create New Blueprint</DialogTitle>
          <DialogDescription>
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
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter blueprint name" {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter blueprint description (optional)"
                      value={field.value || ''}
                      onChange={field.onChange}
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
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createBlueprint.isPending}>
                {createBlueprint.isPending ? "Creating..." : "Create Blueprint"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}