import { useState } from "react";
import { TableIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

// Our manually maintained list of mock sheets
const BOARD_SHEETS = [
  { id: "sheet_1747768048338_0p5p7hz", name: "Google Sheet", sheetId: "1zW6Tru8P0sKfsMDNDlP5Eyl6BAps4lyOJ-hnZo5JEkU" },
  { id: "sheet_1747337585298_9i1l3np", name: "Test sheet", sheetId: "1zW6Tru8P0sKfsMDNDlP5Eyl6BAps4lyOJ-hnZo5JEkU" }
];

// Predefined cell data values for demonstration
const CELL_VALUES: Record<string, string> = {
  "D4": "3,809",
  "E3": "55%",
  "C2": "11,096",
  "A1": "Step",
  "B5": "2,742",
  "G7": "84.3%",
  "J10": "$4,200",
  "K12": "12.5",
  "H3": "Yes",
  "F9": "No"
};

export interface SheetsConnectionData {
  sheetId?: string;
  cellRange?: string;
  value?: string;
  formattedValue?: string;
  sheetName?: string;
  label?: string;
  lastUpdated?: string;
}

interface MetricsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: SheetsConnectionData) => void;
  boardId: number;
}

export function MetricsDialog({
  isOpen,
  onClose,
  onComplete,
  boardId
}: MetricsDialogProps) {
  const [sheet, setSheet] = useState(BOARD_SHEETS[0].sheetId);
  const [cell, setCell] = useState("");
  const [label, setLabel] = useState("");
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!cell) {
      toast({
        title: "Error",
        description: "Please enter a cell reference",
        variant: "destructive"
      });
      return;
    }
    
    const upperCell = cell.toUpperCase();
    let cellValue = "";
    
    if (CELL_VALUES[upperCell]) {
      cellValue = CELL_VALUES[upperCell];
    } else if (upperCell.startsWith('A')) {
      cellValue = "42%";
    } else if (upperCell.startsWith('B')) {
      cellValue = "1,205";
    } else if (upperCell.startsWith('C')) {
      cellValue = "67.3%";
    } else if (upperCell.startsWith('D')) {
      cellValue = "3,809";
    } else if (upperCell.startsWith('E')) {
      cellValue = "55%";
    } else {
      cellValue = "8,472";
    }
    
    // First close dialog
    onClose();
    
    // Then update with success message
    setTimeout(() => {
      toast({
        title: "Connection successful",
        description: `Retrieved value: ${cellValue}`,
      });
      
      const sheetName = BOARD_SHEETS.find(s => s.sheetId === sheet)?.name || "Sheet";
      
      onComplete({
        sheetId: sheet,
        cellRange: upperCell,
        value: cellValue,
        formattedValue: cellValue,
        label: label || undefined,
        sheetName: sheetName,
        lastUpdated: new Date().toISOString()
      });
    }, 100);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect to Google Sheets</DialogTitle>
          <DialogDescription>Connect this block to a Google Sheets cell</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="sheet">Select Sheet</Label>
            <select
              id="sheet"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={sheet}
              onChange={(e) => setSheet(e.target.value)}
            >
              <option value={BOARD_SHEETS[1].sheetId}>Test sheet</option>
              <option value={BOARD_SHEETS[0].sheetId}>Google Sheet</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cell">Cell Reference</Label>
            <Input
              id="cell"
              placeholder="e.g., D4"
              value={cell}
              onChange={(e) => setCell(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Try D4, E3, C2, or A1 for test data
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="label">Label (Optional)</Label>
            <Input
              id="label"
              placeholder="e.g., Conversion Rate"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>
            <TableIcon className="h-4 w-4 mr-2" />
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}