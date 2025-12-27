import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Copy, Check, Globe, Pencil, Lock } from "lucide-react";
import type { Board } from "@shared/schema";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  board: Board;
  onBoardChange: (updates: Partial<Board>) => void;
}

export function ShareDialog({
  open,
  onOpenChange,
  boardId,
  board,
  onBoardChange,
}: ShareDialogProps) {
  const { toast } = useToast();
  const [copiedTeam, setCopiedTeam] = useState(false);
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [isPublic, setIsPublic] = useState(board.isPublic || false);
  const [allowEditing, setAllowEditing] = useState(board.publicRole === 'editor');

  useEffect(() => {
    setIsPublic(board.isPublic || false);
    setAllowEditing(board.publicRole === 'editor');
  }, [board.isPublic, board.publicRole]);

  const updatePublicSettingsMutation = useMutation({
    mutationFn: async ({ isPublic, publicRole }: { isPublic: boolean; publicRole: string }) => {
      const res = await apiRequest("PATCH", `/api/boards/${boardId}/public`, {
        isPublic,
        publicRole,
      });
      if (!res.ok) {
        throw new Error("Failed to update sharing settings");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards', boardId] });
      onBoardChange(data);
      toast({
        title: "Sharing settings updated",
        description: isPublic
          ? allowEditing
            ? "Anyone with the link can now edit this blueprint"
            : "Anyone with the link can now view this blueprint"
          : "This blueprint is now private",
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

  const handlePublicToggle = (checked: boolean) => {
    setIsPublic(checked);
    if (!checked) {
      setAllowEditing(false);
    }
    updatePublicSettingsMutation.mutate({
      isPublic: checked,
      publicRole: checked && allowEditing ? 'editor' : 'viewer',
    });
  };

  const handleEditingToggle = (checked: boolean) => {
    setAllowEditing(checked);
    updatePublicSettingsMutation.mutate({
      isPublic: true,
      publicRole: checked ? 'editor' : 'viewer',
    });
  };

  const copyToClipboard = async (text: string, type: 'team' | 'public') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'team') {
        setCopiedTeam(true);
        setTimeout(() => setCopiedTeam(false), 2000);
      } else {
        setCopiedPublic(true);
        setTimeout(() => setCopiedPublic(false), 2000);
      }
      toast({
        title: "Link copied",
        description: type === 'team'
          ? "Team access link has been copied to clipboard"
          : "Public access link has been copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const publicUrl = `${window.location.origin}/public/board/${boardId}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Blueprint</DialogTitle>
          <DialogDescription>
            Choose how you want to share this blueprint
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Team Access (Requires Login)
            </h3>
            <div className="flex gap-2">
              <Input
                value={window.location.href}
                readOnly
                className="w-full text-sm"
                data-testid="input-team-link"
              />
              <Button
                onClick={() => copyToClipboard(window.location.href, 'team')}
                variant="outline"
                size="sm"
                data-testid="button-copy-team-link"
              >
                {copiedTeam ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <Label htmlFor="public-toggle" className="text-sm font-medium">
                  Enable Public Access
                </Label>
              </div>
              <Switch
                id="public-toggle"
                checked={isPublic}
                onCheckedChange={handlePublicToggle}
                disabled={updatePublicSettingsMutation.isPending}
                data-testid="switch-public-access"
              />
            </div>
            
            {isPublic && (
              <>
                <div className="flex items-center justify-between pl-6">
                  <div className="flex items-center gap-2">
                    <Pencil className="w-4 h-4" />
                    <Label htmlFor="edit-toggle" className="text-sm font-medium">
                      Anyone with link can edit
                    </Label>
                  </div>
                  <Switch
                    id="edit-toggle"
                    checked={allowEditing}
                    onCheckedChange={handleEditingToggle}
                    disabled={updatePublicSettingsMutation.isPending}
                    data-testid="switch-allow-editing"
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {allowEditing ? "Public Edit Link" : "Public View Link"}
                  </h3>
                  <div className="flex gap-2">
                    <Input
                      value={publicUrl}
                      readOnly
                      className="w-full text-sm"
                      data-testid="input-public-link"
                    />
                    <Button
                      onClick={() => copyToClipboard(publicUrl, 'public')}
                      variant="outline"
                      size="sm"
                      data-testid="button-copy-public-link"
                    >
                      {copiedPublic ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {allowEditing
                      ? "Anyone with this link can view and edit this blueprint without logging in"
                      : "Anyone with this link can view this blueprint in read-only mode"}
                  </p>
                </div>
              </>
            )}
            
            {!isPublic && (
              <p className="text-sm text-muted-foreground pl-6">
                Only team members with access can view this blueprint
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}