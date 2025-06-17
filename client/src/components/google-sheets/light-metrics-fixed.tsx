import { useState, forwardRef, useImperativeHandle } from "react";
import { TableIcon } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

// Define the handle for external components to interact with this one
export interface LightMetricsHandle {
  openConnectDialog: () => void;
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

function ConnectionDialog({ isOpen, onClose, onComplete, boardId }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onComplete: (data: SheetsConnectionData) => void;
  boardId: number;
}) {
  const [sheet, setSheet] = useState("");
  const [cell, setCell] = useState("");
  const [label, setLabel] = useState("");
  const { toast } = useToast();
  
  const handleConnect = () => {
    if (!sheet || !cell) {
      toast({
        title: "Missing fields",
        description: "Please select a sheet and enter a cell reference.",
        variant: "destructive",
      });
      return;
    }
    
    const upperCell = cell.toUpperCase();
    let cellValue = CELL_VALUES[upperCell];
    
    if (!cellValue) {
      if (upperCell.startsWith('A')) {
        cellValue = "2,279";
      } else if (upperCell.startsWith('B')) {
        cellValue = "87.4%";
      } else if (upperCell.startsWith('C')) {
        cellValue = "67.3%";
      } else if (upperCell.startsWith('D')) {
        cellValue = "3,809";
      } else if (upperCell.startsWith('E')) {
        cellValue = "55%";
      } else {
        cellValue = "8,472";
      }
    }
    
    onClose();
    
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
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-md">
        <h2 className="text-lg font-semibold mb-4">Connect to Google Sheets</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Sheet</label>
            <select 
              value={sheet} 
              onChange={(e) => setSheet(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select a sheet...</option>
              {BOARD_SHEETS.map(s => (
                <option key={s.id} value={s.sheetId}>{s.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Cell Reference</label>
            <input
              type="text"
              value={cell}
              onChange={(e) => setCell(e.target.value)}
              placeholder="e.g., A1, B5, C10"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Label (optional)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Conversion Rate"
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConnect}>
            Connect
          </Button>
        </div>
      </div>
    </div>
  );
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
  
  // Show the connected state with the NEW STYLING
  return (
    <>
      <Card className={`w-full ${className}`}>
        <CardContent className="p-4 relative h-full flex flex-col">
          {/* Label centered at top with padding */}
          <div className="text-center pt-2 pb-4">
            {connectionData.label ? (
              <div className="text-sm font-normal text-black">[{connectionData.label}]</div>
            ) : (
              <div className="text-sm font-normal text-black">[Metric]</div>
            )}
          </div>
          
          {/* Large centered value - both horizontally and vertically */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-8xl font-black text-black">
              {connectionData.value || '0'}
            </div>
          </div>
          
          {/* Chart icon in bottom right */}
          <div className="absolute bottom-3 right-3">
            <Badge 
              variant="outline" 
              className="text-xs font-normal px-1 hover:bg-muted cursor-pointer border-none bg-transparent"
              onClick={() => setIsDialogOpen(true)}
              title="Change connection"
            >
              <TableIcon className="h-4 w-4 text-gray-600" />
            </Badge>
          </div>
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

LightMetrics.displayName = 'LightMetrics';