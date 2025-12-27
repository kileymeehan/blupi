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
    <div className="bg-[#0A0A0F] border-b-4 border-[#1976D2]">
      <div className="max-w-[1440px] mx-auto px-8 py-3">
        <div className="flex items-center gap-6">
          <Button asChild className="bauhaus-btn-blue h-9 px-4 text-xs">
            <Link href={backTo}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>

          <div className="flex-1">
            <div className="flex items-center gap-4">
              {isEditing ? (
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-lg font-black uppercase tracking-widest h-9 bg-white text-[#0A0A0F] border-2 border-[#FFD600] rounded-none focus-visible:ring-0"
                  autoFocus
                />
              ) : (
                <h1 className="text-lg font-black uppercase tracking-widest text-white">{title}</h1>
              )}
              {onTitleChange && (
                <Button
                  className="bauhaus-btn h-8 px-4 text-[10px]"
                  onClick={handleEdit}
                  disabled={updateMutation.isPending}
                >
                  {isEditing ? "Save" : "Edit"}
                </Button>
              )}
            </div>
            {description && (
              <p className="text-[10px] font-bold text-[#FFD600] uppercase tracking-wider mt-1">{description}</p>
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