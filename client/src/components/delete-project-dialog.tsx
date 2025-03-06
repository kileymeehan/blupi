import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

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
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ blueprintAction })
      });

      if (!res.ok) {
        const text = await res.text();
        let message: string;
        try {
          const error = JSON.parse(text);
          message = error.message;
        } catch {
          message = "Failed to delete project. Please try again.";
        }
        throw new Error(message);
      }

      // Don't try to parse the response if it's empty
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return res.json();
      }
      return null;
    },
    onSuccess: () => {
      // Invalidate both projects and boards queries since either could be affected
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });

      toast({
        title: "Success",
        description: "Project deleted successfully"
      });

      onOpenChange(false);
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