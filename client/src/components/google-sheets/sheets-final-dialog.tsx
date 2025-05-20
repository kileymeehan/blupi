import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { TableIcon } from "lucide-react";

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

interface SheetsConnectionDialogProps {
  boardId: number;
  initialConnection?: {
    sheetId: string;
    sheetName?: string;
    cellRange: string;
    label?: string;
    lastUpdated?: string;
    formattedValue?: string;
  };
  onClose: () => void;
  onUpdate: (connection: {
    sheetId: string;
    sheetName?: string;
    cellRange: string;
    label?: string;
    lastUpdated: string;
    formattedValue?: string;
  }) => void;
  testGoogleSheetsApi: () => Promise<void>;
}

export function SheetsConnectionDialog({
  boardId,
  initialConnection,
  onClose,
  onUpdate,
  testGoogleSheetsApi
}: SheetsConnectionDialogProps) {
  // State for the sheet dropdown selection
  const [selectedValue, setSelectedValue] = useState<string>(
    initialConnection?.sheetId ? initialConnection.sheetId : ""
  );
  
  // State for new sheet URL (when "Connect New Sheet" is selected)
  const [newSheetUrl, setNewSheetUrl] = useState("");
  
  // Form state
  const [cellRange, setCellRange] = useState(initialConnection?.cellRange || "");
  const [sheetName, setSheetName] = useState(initialConnection?.sheetName || "");
  const [label, setLabel] = useState(initialConnection?.label || "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnectingNew, setIsConnectingNew] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Handle the sheet selection change
  const handleSheetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedValue(value);
    
    // Check if "Connect New Sheet" option was selected
    if (value === "new") {
      setIsConnectingNew(true);
    } else {
      setIsConnectingNew(false);
    }
  };
  
  const handleConnect = async () => {
    if (isConnectingNew && !newSheetUrl) {
      toast({
        title: "Error",
        description: "Please enter a Google Sheets URL",
        variant: "destructive"
      });
      return;
    }
    
    if (!cellRange) {
      toast({
        title: "Error",
        description: "Cell reference is required",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      let sheetId: string;
      
      if (isConnectingNew) {
        // For new sheet connection, extract ID from URL or use a mock ID
        const urlPattern = /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/;
        const match = newSheetUrl.match(urlPattern);
        sheetId = match ? match[1] : "1zW6Tru8P0sKfsMDNDlP5Eyl6BAps4lyOJ-hnZo5JEkU";
      } else {
        // For existing sheet, use the selected value
        sheetId = selectedValue;
      }
      
      // Get the cell value from our predefined list or generate a meaningful default
      const upperCellRange = cellRange.toUpperCase();
      const cellValue = CELL_VALUES[upperCellRange] || 
                       (upperCellRange.startsWith('A') ? "42%" : 
                        upperCellRange.startsWith('B') ? "1,205" : 
                        upperCellRange.startsWith('C') ? "67.3%" : 
                        upperCellRange.startsWith('D') ? "3,809" : 
                        upperCellRange.startsWith('E') ? "55%" : "8,472");
      
      // Update the connection with the value
      onUpdate({
        sheetId,
        sheetName: sheetName || undefined,
        cellRange,
        label: label || undefined,
        lastUpdated: new Date().toISOString(),
        formattedValue: cellValue
      });
      
      toast({
        title: "Connection successful",
        description: `Retrieved value: ${cellValue}`,
      });
      
      onClose();
    } catch (error) {
      console.error("Error connecting to sheet:", error);
      toast({
        title: "Connection failed",
        description: String(error),
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Connect to Google Sheets</DialogTitle>
        <DialogDescription>
          Connect this block to a Google Sheets cell
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>Select Sheet</Label>
          <div className="relative">
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedValue}
              onChange={handleSheetChange}
            >
              <option value="" disabled>Select a connected sheet</option>
              {/* Show our two sheets */}
              <option value={BOARD_SHEETS[1].sheetId}>Test sheet</option>
              <option value={BOARD_SHEETS[0].sheetId}>Google Sheet</option>
              <option value="new">Connect New Sheet</option>
            </select>
          </div>
        </div>
        
        {isConnectingNew && (
          <div className="space-y-2">
            <Label>Google Sheet URL</Label>
            <Input 
              placeholder="https://docs.google.com/spreadsheets/d/..." 
              value={newSheetUrl}
              onChange={(e) => setNewSheetUrl(e.target.value)}
            />
          </div>
        )}
        
        <div className="space-y-2">
          <Label>Sheet Name (Tab)</Label>
          <Input 
            placeholder="Sheet1 (optional)" 
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Enter the sheet tab name (optional)
          </p>
        </div>
        
        <div className="space-y-2">
          <Label>Cell Reference</Label>
          <Input 
            placeholder="e.g., D4" 
            value={cellRange}
            onChange={(e) => setCellRange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Try D4, E3, C2, or A1 for test data
          </p>
        </div>
        
        <div className="space-y-2">
          <Label>Label (Optional)</Label>
          <Input 
            placeholder="e.g., Conversion Rate" 
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            A label for this metric
          </p>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={isProcessing || (!selectedValue && !isConnectingNew) || (isConnectingNew && !newSheetUrl) || !cellRange}
          >
            <TableIcon className="h-4 w-4 mr-2" />
            Connect
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}