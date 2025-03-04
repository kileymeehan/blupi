import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Project } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AddToProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: number;
}

export default function AddToProjectDialog({ open, onOpenChange, boardId }: AddToProjectDialogProps) {
  const [selectedProject, setSelectedProject] = useState<string>();
  const { toast } = useToast();

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"]
  });

  const addToProjectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "PATCH",
        `/api/boards/${boardId}`,
        { projectId: Number(selectedProject) }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Blueprint added to project"
      });
      onOpenChange(false);
    }
  });

  const handleSubmit = () => {
    if (selectedProject) {
      addToProjectMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Select
            value={selectedProject}
            onValueChange={setSelectedProject}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={String(project.id)}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!selectedProject || addToProjectMutation.isPending}
          >
            Add to Project
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
