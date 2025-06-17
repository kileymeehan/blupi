import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Search, FileText, Plus, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Board, Phase, Block } from "@shared/schema";
import { nanoid } from "nanoid";

interface BlueprintImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (phases: Phase[], blocks: Block[], placement: 'beginning' | 'end') => void;
  currentBoardId?: number;
}

export function BlueprintImportDialog({
  open,
  onOpenChange,
  onImport,
  currentBoardId
}: BlueprintImportDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [placement, setPlacement] = useState<'beginning' | 'end'>('end');
  const { toast } = useToast();

  const { data: boards = [], isLoading } = useQuery<Board[]>({
    queryKey: ["/api/boards"],
    enabled: open,
  });

  // Filter out current board and only show boards with phases
  const availableBoards = boards.filter((board: Board) => 
    board.id !== currentBoardId && 
    board.phases && 
    board.phases.length > 0 &&
    board.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleImportPhases = (board: Board) => {
    if (!board.phases || board.phases.length === 0) {
      toast({
        title: "No phases to import",
        description: "This blueprint doesn't have any phases to import.",
        variant: "destructive",
      });
      return;
    }

    // Create new phases with new IDs to avoid conflicts
    const importedPhases: Phase[] = board.phases.map(phase => ({
      ...phase,
      id: nanoid(),
      importedFromBoardId: board.id,
      columns: phase.columns.map(column => ({
        ...column,
        id: nanoid(),
      }))
    }));

    // Import blocks from the blueprint with updated phase/column indices
    const importedBlocks: Block[] = (board.blocks || []).map(block => ({
      ...block,
      id: nanoid(), // Generate new ID to avoid conflicts
    }));

    onImport(importedPhases, importedBlocks, placement);
    onOpenChange(false);
    
    toast({
      title: "Blueprint imported",
      description: `Successfully imported ${importedPhases.length} phase(s) and ${importedBlocks.length} block(s) from "${board.name}".`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Import Blueprint as Phase</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search blueprints</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Search by blueprint name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Placement</Label>
            <RadioGroup value={placement} onValueChange={(value: 'beginning' | 'end') => setPlacement(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="beginning" id="beginning" />
                <Label htmlFor="beginning">Add at beginning</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="end" id="end" />
                <Label htmlFor="end">Add at end</Label>
              </div>
            </RadioGroup>
          </div>

          <ScrollArea className="h-[400px] border rounded-lg p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-sm text-gray-500">Loading blueprints...</div>
              </div>
            ) : availableBoards.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 space-y-2">
                <FileText className="h-8 w-8 text-gray-400" />
                <div className="text-sm text-gray-500">
                  {searchTerm ? "No blueprints match your search" : "No available blueprints to import"}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {availableBoards.map((board: Board) => (
                  <div
                    key={board.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <h3 className="font-medium text-sm truncate">
                            {board.name || "Untitled Blueprint"}
                          </h3>
                        </div>
                        
                        {board.description && (
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {board.description}
                          </p>
                        )}
                        
                        <div className="text-xs text-gray-500">
                          {board.phases?.length || 0} phase(s) • 
                          {board.blocks?.length || 0} block(s)
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => handleImportPhases(board)}
                        className="ml-3 flex-shrink-0"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Import
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function BlueprintImportTrigger({ 
  onImport, 
  currentBoardId 
}: { 
  onImport: (phases: Phase[], blocks: Block[], placement: 'beginning' | 'end') => void; 
  currentBoardId?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="Import Blueprint">
          <Download className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <BlueprintImportDialog
        open={open}
        onOpenChange={setOpen}
        onImport={onImport}
        currentBoardId={currentBoardId}
      />
    </Dialog>
  );
}