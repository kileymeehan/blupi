import { useState, useEffect } from "react";
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

// We'll replace these with actual sheets from API
const DEFAULT_SHEETS = [
  { id: "sheet_1747768048338_0p5p7hz", name: "Google Sheet", sheetId: "1zW6Tru8P0sKfsMDNDlP5Eyl6BAps4lyOJ-hnZo5JEkU" },
  { id: "sheet_1747337585298_9i1l3np", name: "Test sheet", sheetId: "1zW6Tru8P0sKfsMDNDlP5Eyl6BAps4lyOJ-hnZo5JEkU" }
];

// Mock cell data
const MOCK_CELL_DATA = {
  "D4": { value: "3,809", formattedValue: "3,809" },
  "E3": { value: "55%", formattedValue: "55%" },
  "C2": { value: "11,096", formattedValue: "11,096" },
  "A1": { value: "Step", formattedValue: "Step" }
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
  const [selectedSheetId, setSelectedSheetId] = useState(
    initialConnection?.sheetId === TEST_SHEETS[0].sheetId ? 
    TEST_SHEETS[0].id : 
    (initialConnection?.sheetId === TEST_SHEETS[1].sheetId ? 
      TEST_SHEETS[1].id : 
      TEST_SHEETS[0].id)
  );
  const [cellRange, setCellRange] = useState(initialConnection?.cellRange || "");
  const [sheetName, setSheetName] = useState(initialConnection?.sheetName || "");
  const [label, setLabel] = useState(initialConnection?.label || "");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Handle connect button
  const handleConnect = async () => {
    if (!cellRange) {
      toast({
        title: "Error",
        description: "Cell reference is required",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const selectedSheet = TEST_SHEETS.find(sheet => sheet.id === selectedSheetId);
      if (!selectedSheet) {
        throw new Error("Selected sheet not found");
      }
      
      // Get mock data for the cell
      const cellKey = cellRange.toUpperCase();
      const mockData = MOCK_CELL_DATA[cellKey] || { 
        value: `Mock value for ${cellKey}`, 
        formattedValue: `Mock value for ${cellKey}` 
      };
      
      // Update the connection
      onUpdate({
        sheetId: selectedSheet.sheetId,
        sheetName: sheetName || undefined,
        cellRange,
        label: label || undefined,
        lastUpdated: new Date().toISOString(),
        formattedValue: mockData.formattedValue
      });
      
      toast({
        title: "Connection successful",
        description: `Connected to ${selectedSheet.name}. Retrieved value: ${mockData.formattedValue}`,
      });
      
      onClose();
    } catch (error) {
      console.error('Error connecting to sheet:', error);
      toast({
        title: "Connection failed",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>Connect to Google Sheets</DialogTitle>
        <DialogDescription>
          Connect this block to a Google Sheets cell
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Select Sheet</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={selectedSheetId}
            onChange={(e) => setSelectedSheetId(e.target.value)}
          >
            {TEST_SHEETS.map((sheet) => (
              <option key={sheet.id} value={sheet.id}>
                {sheet.name}
              </option>
            ))}
          </select>
          <p className="text-sm text-muted-foreground">
            Select a connected sheet
          </p>
        </div>
        
        <div className="space-y-2">
          <Label>Sheet Name (Tab)</Label>
          <Input 
            placeholder="Sheet1 (optional)" 
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Enter the sheet tab name (optional)
          </p>
        </div>
        
        <div className="space-y-2">
          <Label>Cell Reference</Label>
          <Input 
            placeholder="e.g., A1, D4, or E3" 
            value={cellRange}
            onChange={(e) => setCellRange(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
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
          <p className="text-sm text-muted-foreground">
            A label for this metric
          </p>
        </div>
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
          disabled={isProcessing || !cellRange}
        >
          <TableIcon className="h-4 w-4 mr-2" />
          Connect
        </Button>
      </div>
    </DialogContent>
  );
}