import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { insertProjectSchema, type InsertProject } from "@shared/schema";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
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
  const { user } = useFirebaseAuth();
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Get existing projects to determine next color
  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json();
    }
  });

  // Get next color by finding the first unused color in the sequence
  const getNextColor = () => {
    if (projects.length === 0) return projectColors[0];

    const lastProject = projects[projects.length - 1];
    const lastColorIndex = projectColors.indexOf(lastProject.color);

    // If the last color wasn't in our list or was the last color,
    // start from the beginning
    if (lastColorIndex === -1 || lastColorIndex === projectColors.length - 1) {
      return projectColors[0];
    }

    // Return the next color in sequence
    return projectColors[lastColorIndex + 1];
  };

  const form = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      color: getNextColor()
    },
  });

  const createProject = useMutation({
    mutationFn: async (data: InsertProject) => {
      try {
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...data,
            createdBy: user?.email
          }),
        });

        let responseData;
        try {
          const text = await response.text();
          responseData = JSON.parse(text);
        } catch (parseError) {
          console.error('Failed to parse response:', parseError);
          throw new Error('Server returned invalid JSON');
        }

        if (!response.ok) {
          throw new Error(responseData.message || "Failed to create project");
        }

        return responseData;
      } catch (error) {
        console.error('Project creation error:', error);
        if (error instanceof Error) {
          throw new Error(error.message);
        }
        throw new Error("An unexpected error occurred");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      onOpenChange(false);
      form.reset({
        name: "",
        description: "",
        color: getNextColor() // Set new color for next project
      });
      setShowCustomPicker(false);
    },
    onError: (error: Error) => {
      console.error('Project creation error:', error);
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