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
import { generateBlueprintTemplate } from "@/lib/ai-service";
import { Loader2 } from "lucide-react";

interface CreateBlueprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: number;
}

export function CreateBlueprintDialog({ open, onOpenChange, projectId }: CreateBlueprintDialogProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);

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

  const handleGenerateTemplate = async () => {
    try {
      setIsGeneratingTemplate(true);
      console.log('Starting template generation...');

      const template = await generateBlueprintTemplate({
        industry: "general",
        complexity: "detailed"
      });

      console.log('Template generated successfully:', template);

      if (!template.name || !template.description) {
        throw new Error('Generated template is missing required fields');
      }

      // Update form with generated content
      form.setValue("name", template.name);
      form.setValue("description", template.description);

      // Show success message
      toast({
        title: "Template Generated",
        description: "AI-generated template has been loaded successfully.",
      });
    } catch (error) {
      console.error('Template generation error:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error 
          ? error.message 
          : "Failed to generate template. Please check your connection and try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingTemplate(false);
    }
  };

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
    onSuccess: async (data) => {
      await queryClient.prefetchQuery({
        queryKey: ['/api/boards', data.id],
        queryFn: async () => data
      });

      queryClient.setQueryData(['/api/boards'], (oldData: any[] = []) => [...oldData, data]);

      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/boards', { projectId }] });
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

            <Button
              type="button"
              variant="outline"
              onClick={handleGenerateTemplate}
              disabled={isGeneratingTemplate}
              className="w-full mb-4"
            >
              {isGeneratingTemplate ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Template...
                </>
              ) : (
                'Generate Template with AI'
              )}
            </Button>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createBlueprint.isPending || isGeneratingTemplate}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createBlueprint.isPending || isGeneratingTemplate}
                className="bg-amber-600 hover:bg-amber-700"
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