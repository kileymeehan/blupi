import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PageHeaderProps {
  title: string;
  description?: string | null;
  onTitleChange?: (newTitle: string) => Promise<void>;
  backTo?: string;
  backLabel?: string;
  rightContent?: React.ReactNode;
}

export function PageHeader({ 
  title, 
  description, 
  onTitleChange,
  backTo = "/",
  backLabel = "Home",
  rightContent
}: PageHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!onTitleChange) return;
      await onTitleChange(editedTitle);
    },
    onSuccess: () => {
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Title updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = () => {
    if (isEditing) {
      updateMutation.mutate();
    } else {
      setIsEditing(true);
    }
  };

  return (
    <div className="border-b">
      <div className="max-w-[1440px] mx-auto px-8 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild className="p-2">
            <Link href={backTo}>
              <ChevronLeft className="h-4 w-4" />
              Back to {backLabel}
            </Link>
          </Button>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-lg font-semibold h-9"
                  autoFocus
                />
              ) : (
                <h1 className="text-lg font-semibold">{title}</h1>
              )}
              {onTitleChange && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                  disabled={updateMutation.isPending}
                >
                  {isEditing ? "Save" : "Edit"}
                </Button>
              )}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>

          {rightContent && (
            <div>
              {rightContent}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}