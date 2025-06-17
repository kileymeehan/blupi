import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

interface BoardImportDialogProps {
  projectId: number;
  onSuccess?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BoardImportDialog({ projectId, onSuccess, open, onOpenChange }: BoardImportDialogProps) {
  const [sheetUrl, setSheetUrl] = useState("");
  const [boardName, setBoardName] = useState("");
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const importMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/boards/import-sheet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sheetUrl,
          boardName: boardName || "Imported Board",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to import board from Google Sheet');
      }

      return response.json();
    },
    onSuccess: (board) => {
      toast({
        title: "Success",
        description: "Board imported successfully from Google Sheet",
      });
      onOpenChange(false);
      setSheetUrl("");
      setBoardName("");
      if (onSuccess) {
        onSuccess();
      }
      // Navigate to the new board
      setLocation(`/board/${board.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrl.trim()) {
      toast({
        title: "Missing URL",
        description: "Please enter a Google Sheets URL",
        variant: "destructive",
      });
      return;
    }
    importMutation.mutate();
  };

  const extractSheetId = (url: string): string | null => {
    const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const isValidSheetUrl = sheetUrl.trim() && extractSheetId(sheetUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import Board from Google Sheets</DialogTitle>
          <DialogDescription>
            Import a new board from a Google Sheets document. The spreadsheet should have days/phases as columns and activities as rows.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sheetUrl">Google Sheets URL</Label>
            <Input
              id="sheetUrl"
              type="url"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="boardName">Board Name (optional)</Label>
            <Input
              id="boardName"
              placeholder="Enter board name or leave blank to auto-generate"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValidSheetUrl || importMutation.isPending}
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import Board"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}