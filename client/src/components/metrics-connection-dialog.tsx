import { useState } from "react";
import { TableIcon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import type { SheetsConnection } from "@shared/schema";

interface MetricsConnectionDialogProps {
  blockId: string;
  initialConnection?: SheetsConnection;
  onSave: (blockId: string, connection: SheetsConnection) => void;
  blockType?: 'metrics' | 'experiment';
}

export function MetricsConnectionDialog({
  blockId,
  initialConnection,
  onSave,
  blockType = 'metrics'
}: MetricsConnectionDialogProps) {
  const [open, setOpen] = useState(false);
  
  // Create sample data based on cell references
  const sampleData: Record<string, string> = {
    "A1": "Step 1",
    "B2": "75%",
    "C2": "11,096",
    "C4": "2,279", 
    "D4": "3,809",
    "E3": "55%",
    "G7": "84.3%"
  };

  const handleSaveClick = () => {
    // Get values from form inputs
    const cellRef = document.getElementById(`cell-${blockId}`) as HTMLInputElement;
    const labelInput = document.getElementById(`label-${blockId}`) as HTMLInputElement;
    
    if (!cellRef) return;
    
    const cell = cellRef.value.toUpperCase();
    const label = labelInput?.value || "";
    
    // Create connection data with sample values
    const connection: SheetsConnection = {
      sheetId: "sample-sheet-id",
      cellRange: cell || "D4",
      formattedValue: sampleData[cell] || "3,809",
      label: label || undefined,
      sheetName: "sample-sheet",
      lastUpdated: new Date().toISOString()
    };
    
    // Call the save handler
    onSave(blockId, connection);
    setOpen(false);
  };

  return (
    <>
      {/* Simple dialog trigger button styled as an icon */}
      <DialogTrigger asChild>
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          className={`
            flex items-center justify-center w-6 h-6 p-0
            rounded bg-white border ${blockType === 'experiment' ? 'border-amber-200' : 'border-gray-200'}
            hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary
          `}
        >
          <TableIcon className="h-3 w-3 text-gray-500" />
        </button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect to Google Sheets</DialogTitle>
          <DialogDescription>
            Enter a cell reference to display data from Google Sheets.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor={`cell-${blockId}`}>Cell Reference</Label>
            <Input 
              id={`cell-${blockId}`} 
              placeholder="e.g., D4"
              defaultValue={initialConnection?.cellRange || ""} 
            />
            <p className="text-xs text-muted-foreground">
              Try different cells like D4, E3, C2, G7, etc.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor={`label-${blockId}`}>Label (Optional)</Label>
            <Input 
              id={`label-${blockId}`} 
              placeholder="e.g., Conversion Rate" 
              defaultValue={initialConnection?.label || ""} 
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSaveClick}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </>
  );
}