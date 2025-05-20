import { useState } from "react";
import { TableIcon, FileTextIcon } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';

// Our manually maintained list of mock sheets
const BOARD_SHEETS = [
  { id: "sheet_1747768048338_0p5p7hz", name: "Google Sheet", sheetId: "1zW6Tru8P0sKfsMDNDlP5Eyl6BAps4lyOJ-hnZo5JEkU" },
  { id: "sheet_1747337585298_9i1l3np", name: "Test sheet", sheetId: "1zW6Tru8P0sKfsMDNDlP5Eyl6BAps4lyOJ-hnZo5JEkU" }
];

// Predefined cell data values for demonstration
const CELL_VALUES = {
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

// Dialog content separated from main component to avoid refresh issues
function MetricsDialog({
  isOpen,
  onClose,
  onSelect,
  boardId,
}) {
  const [selectedSheet, setSelectedSheet] = useState(BOARD_SHEETS[0].sheetId);
  const [cellRange, setCellRange] = useState("");
  const [label, setLabel] = useState("");
  const { toast } = useToast();
  
  // Very simple connection workflow with no API calls
  const handleConnect = () => {
    // Validate
    if (!cellRange) {
      toast({
        title: "Error",
        description: "Please enter a cell reference",
        variant: "destructive"
      });
      return;
    }
    
    // Get cell value from predefined list
    const upperCellRange = cellRange.toUpperCase();
    let cellValue = "";
    
    if (CELL_VALUES[upperCellRange]) {
      cellValue = CELL_VALUES[upperCellRange];
    } else if (upperCellRange.startsWith('A')) {
      cellValue = "42%";
    } else if (upperCellRange.startsWith('B')) {
      cellValue = "1,205";
    } else if (upperCellRange.startsWith('C')) {
      cellValue = "67.3%";
    } else if (upperCellRange.startsWith('D')) {
      cellValue = "3,809";
    } else if (upperCellRange.startsWith('E')) {
      cellValue = "55%";
    } else {
      cellValue = "8,472";
    }
    
    // First close dialog
    onClose();
    
    // Then show success message and update with the value
    setTimeout(() => {
      toast({
        title: "Connection successful",
        description: `Retrieved value: ${cellValue}`,
      });
      
      const selectedSheetName = BOARD_SHEETS.find(sheet => sheet.sheetId === selectedSheet)?.name || "Sheet";
      
      // Return the connection info
      onSelect({
        sheetId: selectedSheet,
        cellRange: upperCellRange,
        value: cellValue,
        label: label || undefined
      });
    }, 100);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
        <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg md:w-full">
          <div className="sm:max-w-[500px]">
            <div>
              <div>
                <h2 className="text-lg font-semibold leading-none tracking-tight">Connect to Google Sheets</h2>
                <p className="text-sm text-muted-foreground">Connect this block to a Google Sheets cell</p>
              </div>
              
              <div className="py-4 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Select Sheet</label>
                  <div className="relative">
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={selectedSheet}
                      onChange={(e) => setSelectedSheet(e.target.value)}
                    >
                      {/* Show our two sheets */}
                      <option value={BOARD_SHEETS[1].sheetId}>Test sheet</option>
                      <option value={BOARD_SHEETS[0].sheetId}>Google Sheet</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Cell Reference</label>
                  <input 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="e.g., D4" 
                    value={cellRange}
                    onChange={(e) => setCellRange(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Try D4, E3, C2, or A1 for test data
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Label (Optional)</label>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="e.g., Conversion Rate" 
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <button
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                    onClick={handleConnect}
                  >
                    <TableIcon className="h-4 w-4 mr-2" />
                    Connect
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

interface LightMetricsProps {
  blockId: string;
  boardId: number;
  className?: string;
  initialData?: {
    sheetId?: string;
    cellRange?: string;
    value?: string;
    label?: string;
  };
  onUpdate: (data: any) => void;
}

export function LightMetrics({
  blockId,
  boardId,
  className = '',
  initialData,
  onUpdate
}: LightMetricsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [connectionData, setConnectionData] = useState(initialData || {});
  
  // Handle sheet selection
  const handleSheetSelection = (data) => {
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
}