import { useState } from "react";
import { X, TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Simple interface for Sheets connection data
export interface SimpleConnection {
  sheetId: string;
  cellRange: string;
  formattedValue?: string;
  label?: string;
  sheetName?: string;
  lastUpdated: string;
}

interface SimpleMetricsDialogProps {
  blockId: string;
  initialConnection?: SimpleConnection;
  onUpdate: (connection: SimpleConnection) => void;
}

export function SimpleMetricsDialog({
  blockId,
  initialConnection,
  onUpdate
}: SimpleMetricsDialogProps) {
  const [open, setOpen] = useState(false);
  
  // Sample data cells to show something useful
  const cellValues: Record<string, string> = {
    "D4": "3,809",
    "E3": "55%",
    "C2": "11,096",
    "B5": "2,742",
    "G7": "84.3%",
    "A1": "Step 1",
    "C4": "2,279"
  };
  
  const handleSave = () => {
    const cellInput = document.getElementById(`cell-${blockId}`) as HTMLInputElement;
    const labelInput = document.getElementById(`label-${blockId}`) as HTMLInputElement;
    
    if (!cellInput) return;
    
    const cell = cellInput.value.toUpperCase() || "D4";
    const label = labelInput?.value || "";
    
    // Create connection data
    const connection: SimpleConnection = {
      sheetId: "1zW6Tru8P0sKfsMDNDlP5Eyl6BAps4lyOJ-hnZo5JEkU",
      cellRange: cell,
      formattedValue: cellValues[cell] || "3,809",
      label: label || undefined,
      sheetName: "funnel-list",
      lastUpdated: new Date().toISOString()
    };
    
    onUpdate(connection);
    setOpen(false);
  };
  
  // If we have a connection, show the value with an edit button
  if (initialConnection?.cellRange) {
    return (
      <div className="bg-gray-50 p-3 rounded-md">
        <div className="flex justify-between items-center">
          {initialConnection.label && (
            <div className="text-xs text-gray-500 mb-1">{initialConnection.label}</div>
          )}
          <div className="text-2xl font-semibold">
            {initialConnection.formattedValue || cellValues[initialConnection.cellRange] || "—"}
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500">
              Cell: {initialConnection.cellRange}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={() => setOpen(true)}
            >
              <TableIcon className="h-4 w-4" />
            </Button>
            
            <Dialog open={open} onOpenChange={setOpen}>
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
                      placeholder="e.g., C4"
                      defaultValue={initialConnection.cellRange || ""} 
                    />
                    <p className="text-xs text-muted-foreground">
                      Try D4, E3, C2, B5, G7 for sample data
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`label-${blockId}`}>Label (Optional)</Label>
                    <Input 
                      id={`label-${blockId}`} 
                      placeholder="e.g., Conversion Rate" 
                      defaultValue={initialConnection.label || ""} 
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
                  <Button onClick={handleSave}>
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    );
  }
  
  // If no connection, show a button to create one
  return (
    <div className="bg-gray-50 p-3 rounded-md text-center">
      <Button 
        variant="outline" 
        size="sm"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        <TableIcon className="h-4 w-4 mr-2" />
        Connect to Google Sheets
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
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
                placeholder="e.g., C4"
              />
              <p className="text-xs text-muted-foreground">
                Try D4, E3, C2, B5, G7 for sample data
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor={`label-${blockId}`}>Label (Optional)</Label>
              <Input 
                id={`label-${blockId}`} 
                placeholder="e.g., Conversion Rate" 
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
            <Button onClick={handleSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}