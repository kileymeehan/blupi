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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
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

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      // First create the project
      const projectRes = await apiRequest(
        "POST",
        "/api/projects",
        { name: newProjectName, description: newProjectDescription }
      );
      const project = await projectRes.json();

      // Then add the board to the project
      const boardRes = await apiRequest(
        "PATCH",
        `/api/boards/${boardId}`,
        { projectId: project.id }
      );
      return boardRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "New project created and blueprint added"
      });
      onOpenChange(false);
      setIsCreatingProject(false);
      setNewProjectName("");
      setNewProjectDescription("");
    }
  });

  const handleSubmit = () => {
    if (isCreatingProject) {
      if (newProjectName.trim()) {
        createProjectMutation.mutate();
      }
    } else if (selectedProject) {
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
          {!isCreatingProject ? (
            <>
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

              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreatingProject(true)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Project
                </Button>

                <Button
                  className="w-full bg-amber-600 hover:bg-amber-700"
                  onClick={handleSubmit}
                  disabled={!selectedProject || addToProjectMutation.isPending}
                >
                  Add to Project
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project Name</label>
                  <Input
                    placeholder="Enter project name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    placeholder="Enter project description (optional)"
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreatingProject(false)}
                  className="w-full"
                >
                  Back to Project Selection
                </Button>

                <Button
                  className="w-full bg-amber-600 hover:bg-amber-700"
                  onClick={handleSubmit}
                  disabled={!newProjectName.trim() || createProjectMutation.isPending}
                >
                  Create Project and Add Blueprint
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}