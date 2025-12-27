import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertProjectSchema, type InsertProject } from "@shared/schema";
import { Paintbrush } from "lucide-react";

// Project colors with 75% opacity
const projectColors = [
  "#FFB3B3C0", // Pastel Pink with 75% opacity
  "#B3FFB3C0", // Pastel Green with 75% opacity
  "#B3B3FFC0", // Pastel Blue with 75% opacity
  "#FFE6B3C0", // Pastel Orange with 75% opacity
  "#E6B3FFC0", // Pastel Purple with 75% opacity
  "#B3FFE6C0", // Pastel Mint with 75% opacity
  "#FFB3E6C0", // Pastel Rose with 75% opacity
  "#E6FFB3C0", // Pastel Lime with 75% opacity
  "#B3E6FFC0", // Pastel Sky with 75% opacity
  "#FFE6E6C0", // Soft Pink with 75% opacity
  "#E6FFE6C0", // Soft Mint with 75% opacity
  "#E6E6FFC0", // Soft Lavender with 75% opacity
];

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
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
      const response = await apiRequest(
        'POST',
        '/api/projects',
        {
          ...data,
          color: data.color || projectColors[currentColorIndex]
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create project");
      }

      return response.json();
    },
    onSuccess: async (data) => {
      // First invalidate and refetch to ensure data is fresh
      await queryClient.invalidateQueries({ queryKey: ["/api/projects"] });

      // Show success message
      toast({
        title: "Success",
        description: "Project created successfully"
      });

      // Close dialog and navigate only after we have fresh data
      onOpenChange(false);
      setLocation(`/project/${data.id}`);
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
      <DialogContent className="border-4 border-[#0A0A0F] rounded-none shadow-[8px_8px_0px_0px_#0A0A0F] bg-white">
        <DialogHeader>
          <DialogTitle className="font-black uppercase tracking-wide text-[#0A0A0F]">Create New Project</DialogTitle>
          <DialogDescription className="text-gray-600">
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
                  <FormLabel className="font-bold uppercase tracking-wide text-xs">Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter project name" 
                      {...field} 
                      autoFocus
                      className="border-2 border-[#0A0A0F] rounded-none focus:ring-[#FFD600] focus:border-[#0A0A0F]"
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
                  <FormLabel className="font-bold uppercase tracking-wide text-xs">Description</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter project description (optional)" 
                      value={field.value || ''} 
                      onChange={field.onChange}
                      className="border-2 border-[#0A0A0F] rounded-none focus:ring-[#FFD600] focus:border-[#0A0A0F]"
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
                  <FormLabel className="font-bold uppercase tracking-wide text-xs">Project Color</FormLabel>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-10 h-10 rounded-none border-2 border-[#0A0A0F] cursor-pointer transition-transform hover:scale-105 shadow-[2px_2px_0px_0px_#0A0A0F]"
                      style={{ backgroundColor: field.value }}
                      onClick={() => setColorPickerOpen(!colorPickerOpen)}
                    />
                    {colorPickerOpen && (
                      <div className="flex gap-2 items-center flex-wrap">
                        {projectColors.map((color) => (
                          <div
                            key={color}
                            className={`w-8 h-8 rounded-none border-2 border-[#0A0A0F] cursor-pointer transition-transform hover:scale-105 ${
                              field.value === color ? 'ring-2 ring-offset-2 ring-[#FFD600]' : ''
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
                          className={`w-8 h-8 rounded-none border-2 border-[#0A0A0F] cursor-pointer transition-transform hover:scale-105 flex items-center justify-center ${
                            showCustomPicker ? 'ring-2 ring-offset-2 ring-[#FFD600]' : ''
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
                        className="w-full h-10 p-1 cursor-pointer border-2 border-[#0A0A0F] rounded-none"
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

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createProject.isPending}
                className="border-2 border-[#0A0A0F] rounded-none shadow-[4px_4px_0px_0px_#0A0A0F] hover:bg-gray-100 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] font-bold uppercase tracking-wide transition-all"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createProject.isPending}
                className="bg-[#0A0A0F] text-white border-2 border-[#0A0A0F] rounded-none shadow-[4px_4px_0px_0px_#0A0A0F] hover:bg-[#FFD600] hover:text-[#0A0A0F] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] font-bold uppercase tracking-wide transition-all"
              >
                {createProject.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}