import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { insertProjectSchema, type InsertProject } from "@shared/schema";
import { Paintbrush } from "lucide-react";

// Predefined project colors - high contrast, visually distinct colors
const projectColors = [
  "#4F46E5", // Indigo
  "#DC2626", // Red
  "#059669", // Emerald
  "#7C3AED", // Purple
  "#D97706", // Amber
  "#2563EB", // Blue
  "#BE185D", // Pink
  "#15803D", // Green
  "#9333EA", // Violet
];

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const { toast } = useToast();
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [currentColorIndex, setCurrentColorIndex] = useState(0);

  const form = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      color: projectColors[0]
    },
  });

  // Reset form and update color when dialog opens
  useEffect(() => {
    if (open) {
      const nextIndex = (currentColorIndex + 1) % projectColors.length;
      setCurrentColorIndex(nextIndex);
      form.reset({
        name: "",
        description: "",
        color: projectColors[nextIndex]
      });
      setShowCustomPicker(false);
      setColorPickerOpen(false);
    }
  }, [open]);

  const createProject = useMutation({
    mutationFn: async (data: InsertProject) => {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          color: data.color || projectColors[currentColorIndex] // Ensure color is always sent
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create project");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertProject) => {
    createProject.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a project to organize your blueprints
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
                    <Input placeholder="Enter project name" {...field} />
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
                      placeholder="Enter project description (optional)" 
                      value={field.value || ''} 
                      onChange={field.onChange} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Color</FormLabel>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-10 h-10 rounded-md border cursor-pointer transition-transform hover:scale-105"
                      style={{ backgroundColor: field.value }}
                      onClick={() => setColorPickerOpen(!colorPickerOpen)}
                    />
                    {colorPickerOpen && (
                      <div className="flex gap-2 items-center flex-wrap">
                        {projectColors.map((color) => (
                          <div
                            key={color}
                            className={`w-8 h-8 rounded-md border cursor-pointer transition-transform hover:scale-105 ${
                              field.value === color ? 'ring-2 ring-offset-2 ring-primary' : ''
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              field.onChange(color);
                              setColorPickerOpen(false);
                              setShowCustomPicker(false);
                            }}
                          />
                        ))}
                        <div
                          className={`w-8 h-8 rounded-md border cursor-pointer transition-transform hover:scale-105 flex items-center justify-center ${
                            showCustomPicker ? 'ring-2 ring-offset-2 ring-primary' : ''
                          }`}
                          onClick={() => setShowCustomPicker(!showCustomPicker)}
                        >
                          <Paintbrush className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                  </div>
                  {showCustomPicker && (
                    <div className="mt-2">
                      <Input 
                        type="color"
                        className="w-full h-10 p-1 cursor-pointer"
                        value={field.value}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          setColorPickerOpen(false);
                        }}
                      />
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createProject.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createProject.isPending}>
                {createProject.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}