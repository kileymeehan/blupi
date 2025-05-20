import { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { TableIcon, FileTextIcon, CheckCircle, XCircle } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Define the handle for external components to interact with this one
export interface LightMetricsHandle {
  openConnectDialog: () => void;
}

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

// Simplified connection dialog that doesn't use complex form context
function ConnectionDialog({ isOpen, onClose, onComplete, boardId }: { 
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: any) => void;
  boardId: number;
}) {
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

interface SheetsConnectionData {
  sheetId?: string;
  cellRange?: string;
  value?: string;
  formattedValue?: string;
  sheetName?: string;
  label?: string;
  lastUpdated?: string;
}

interface LightMetricsProps {
  blockId: string;
  boardId: number;
  className?: string;
  initialConnection?: SheetsConnectionData;
  onUpdate: (data: SheetsConnectionData) => void;
}

export const LightMetrics = forwardRef<LightMetricsHandle, LightMetricsProps>(({
  blockId,
  boardId,
  className = '',
  initialConnection,
  onUpdate
}, ref) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [connectionData, setConnectionData] = useState<SheetsConnectionData>(initialConnection || {});
  
  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    openConnectDialog: () => {
      console.log("Opening dialog via ref for block", blockId);
      setIsDialogOpen(true);
    }
  }));
  
  // Handle sheet selection
  const handleSheetSelection = (data: SheetsConnectionData) => {
    console.log("Sheet data selected:", data);
    setConnectionData(data);
    
    // Also trigger the parent update
    onUpdate(data);
  };
  
  // If we don't have connection data, show the "not connected" state
  if (!connectionData.sheetId || !connectionData.cellRange) {
    return (
      <>
        <Card className={`w-full ${className}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TableIcon className="h-3 w-3 mr-1" />
              Google Sheets Metric
            </CardTitle>
            <CardDescription className="text-xs">Connect to Google Sheets</CardDescription>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-sm text-muted-foreground mb-3">
              Connect this metric to data from a Google Sheets cell.
            </p>
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full"
              onClick={() => setIsDialogOpen(true)}
            >
              <TableIcon className="h-3 w-3 mr-2" />
              Connect to Google Sheets
            </Button>
          </CardContent>
        </Card>

        {isDialogOpen && (
          <ConnectionDialog
            isOpen={isDialogOpen}
            onClose={() => setIsDialogOpen(false)}
            onComplete={handleSheetSelection}
            boardId={boardId}
          />
        )}
      </>
    );
  }
  
  // Show the connected state with the value
  return (
    <>
      <Card className={`w-full ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="flex items-center">
              <TableIcon className="h-3 w-3 mr-1" />
              Google Sheets Metric
            </span>
            <Badge 
              variant="outline" 
              className="text-xs font-normal px-1 ml-1 hover:bg-muted cursor-pointer"
              onClick={() => setIsDialogOpen(true)}
            >
              <TableIcon className="h-2.5 w-2.5 mr-1" />
              Change
            </Badge>
          </CardTitle>
          {connectionData.label && (
            <CardDescription className="text-xs">{connectionData.label}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <p className="text-2xl font-semibold">{connectionData.value || '—'}</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Cell: {connectionData.cellRange}
          </p>
        </CardContent>
      </Card>

      {isDialogOpen && (
        <ConnectionDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onComplete={handleSheetSelection}
          boardId={boardId}
        />
      )}
    </>
  );
});
}

interface LightMetricsProps {
  blockId: string;
  boardId: number;
  className?: string;
  initialConnection?: {
    sheetId: string;
    cellRange: string;
    sheetName?: string;
    label?: string;
    formattedValue?: string;
    lastUpdated?: string;
  };
  onUpdate: (data: any) => void;
}

export const LightMetrics = forwardRef<LightMetricsHandle, LightMetricsProps>(({
  blockId,
  boardId,
  className = '',
  initialConnection,
  onUpdate
}, ref) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [connectionData, setConnectionData] = useState(initialConnection || {});
  
  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    openConnectDialog: () => setIsDialogOpen(true)
  }));
  
  // Handle sheet selection
  const handleSheetSelection = (data: any) => {
    setConnectionData(data);
    
    // Also trigger the parent update
    onUpdate({
      ...data,
      lastUpdated: new Date().toISOString()
    });
  };
  
  // If we don't have connection data, show the "not connected" state
  if (!connectionData.sheetId || !connectionData.cellRange) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <TableIcon className="h-3 w-3 mr-1" />
            Google Sheets Metric
          </CardTitle>
          <CardDescription className="text-xs">Connect to Google Sheets</CardDescription>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-sm text-muted-foreground mb-3">
            Connect this metric to data from a Google Sheets cell.
          </p>
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full"
            onClick={() => setIsDialogOpen(true)}
          >
            <TableIcon className="h-3 w-3 mr-2" />
            Connect to Google Sheets
          </Button>
          
          {isDialogOpen && (
            <MetricsDialog
              isOpen={isDialogOpen}
              onClose={() => setIsDialogOpen(false)}
              onSelect={handleSheetSelection}
              boardId={boardId}
            />
          )}
        </CardContent>
      </Card>
    );
  }
  
  // Show the connected state with the value
  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center">
            <TableIcon className="h-3 w-3 mr-1" />
            Google Sheets Metric
          </span>
          <Badge 
            variant="outline" 
            className="text-xs font-normal px-1 ml-1 hover:bg-muted cursor-pointer"
            onClick={() => setIsDialogOpen(true)}
          >
            <TableIcon className="h-2.5 w-2.5 mr-1" />
            Change
          </Badge>
        </CardTitle>
        {connectionData.label && (
          <CardDescription className="text-xs">{connectionData.label}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <p className="text-2xl font-semibold">{connectionData.value || '—'}</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Cell: {connectionData.cellRange}
        </p>
      </CardContent>
      
      {isDialogOpen && (
        <MetricsDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSelect={handleSheetSelection}
          boardId={boardId}
        />
      )}
    </Card>
  );
});