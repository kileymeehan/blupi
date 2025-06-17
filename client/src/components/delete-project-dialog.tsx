import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface DeleteProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  projectName: string;
}

export function DeleteProjectDialog({ open, onOpenChange, projectId, projectName }: DeleteProjectDialogProps) {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [blueprintAction, setBlueprintAction] = useState<"unassign" | "delete">("unassign");

  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      try {
        console.log('Delete project mutation started:', { projectId, blueprintAction });
        const response = await apiRequest(
          "DELETE",
          `/api/projects/${projectId}`,
          { blueprintAction }
        );

        if (!response.ok) {
          throw new Error("Failed to delete project");
        }

        return true;
      } catch (error) {
        console.error('Delete project error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('Delete project successful');

      // Close the dialog first
      onOpenChange(false);

      // Then invalidate the queries
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });

      // Show success message
      toast({
        title: "Success",
        description: "Project deleted successfully"
      });

      // Finally, navigate away
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Project</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{projectName}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <RadioGroup
            value={blueprintAction}
            onValueChange={(value) => setBlueprintAction(value as "unassign" | "delete")}
            className="space-y-4"
          >
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="unassign" id="unassign" />
              <Label htmlFor="unassign" className="font-normal">
                <div className="font-medium">Unassign blueprints</div>
                <div className="text-sm text-muted-foreground">
                  Keep all blueprints but remove them from this project
                </div>
              </Label>
            </div>
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="delete" id="delete" />
              <Label htmlFor="delete" className="font-normal">
                <div className="font-medium">Delete blueprints</div>
                <div className="text-sm text-muted-foreground">
                  Permanently delete all blueprints in this project
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button 
            variant="destructive" 
            onClick={() => deleteProjectMutation.mutate()}
            disabled={deleteProjectMutation.isPending}
          >
            {deleteProjectMutation.isPending ? "Deleting..." : "Delete Project"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}