import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { insertTagSchema, type Tag } from "@shared/schema";
import { ColorPicker } from "@/components/color-picker";
import { useToast } from "@/hooks/use-toast";

interface TagManagerProps {
  boardId: number;
  onTagSelect?: (tagId: number) => void;
  selectedTagId?: number;
}

export function TagManager({ boardId, onTagSelect, selectedTagId }: TagManagerProps) {
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState("#E2E8F0");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: [`/api/boards/${boardId}/tags`],
    staleTime: 30000,
    gcTime: 1800000,
  });

  const createTagMutation = useMutation({
    mutationFn: async () => {
      const parseResult = insertTagSchema.safeParse({
        name: newTagName,
        color: selectedColor,
        boardId
      });

      if (!parseResult.success) {
        throw new Error(parseResult.error.errors[0].message);
      }

      const res = await apiRequest(
        "POST",
        `/api/boards/${boardId}/tags`,
        parseResult.data
      );
      if (!res.ok) throw new Error("Failed to create tag");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}/tags`] });
      setNewTagName("");
      setSelectedColor("#E2E8F0");
      toast({
        title: "Success",
        description: "Tag created successfully"
      });
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
    <div className="space-y-4">
      <div className="font-medium">All Tags</div>
      
      <div className="space-y-2">
        {tags.map((tag) => (
          <Badge
            key={tag.id}
            variant="outline"
            className={`cursor-pointer flex items-center justify-between ${
              selectedTagId === tag.id ? 'ring-2 ring-primary' : ''
            }`}
            style={{ 
              backgroundColor: `${tag.color}40`,
              borderColor: tag.color
            }}
            onClick={() => onTagSelect?.(tag.id)}
          >
            {tag.name}
          </Badge>
        ))}
      </div>

      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Create New Tag</div>
        <div className="flex gap-2">
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Tag name"
            className="flex-1"
          />
          <ColorPicker
            value={selectedColor}
            onChange={setSelectedColor}
          />
        </div>
        <Button
          size="sm"
          className="w-full"
          disabled={!newTagName.trim() || createTagMutation.isPending}
          onClick={() => createTagMutation.mutate()}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Tag
        </Button>
      </div>
    </div>
  );
}
