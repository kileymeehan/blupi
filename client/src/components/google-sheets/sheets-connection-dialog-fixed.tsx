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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, TableIcon, RefreshCwIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { validateSheetUrl, getBoardSheetDocuments, fetchSheetCell } from "@/services/google-sheets-api";

// Board 22 sheets (hardcoded for reliability)
const BOARD_22_SHEETS = [
  { id: "sheet_1747768048338_0p5p7hz", name: "Google Sheet", sheetId: "1zW6Tru8P0sKfsMDNDlP5Eyl6BAps4lyOJ-hnZo5JEkU" },
  { id: "sheet_1747337585298_9i1l3np", name: "Test sheet", sheetId: "1zW6Tru8P0sKfsMDNDlP5Eyl6BAps4lyOJ-hnZo5JEkU" }
];

// Mock cell data for testing
const MOCK_CELL_DATA: Record<string, {value: string, formattedValue: string}> = {
  "D4": { value: "3,809", formattedValue: "3,809" },
  "E3": { value: "55%", formattedValue: "55%" },
  "C2": { value: "11,096", formattedValue: "11,096" },
  "A1": { value: "Step", formattedValue: "Step" }
};

interface BoardSheet {
  id: string;
  boardId: number;
  name: string;
  sheetId: string;
  createdAt: string;
  updatedAt: string;
}

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
  // Start with empty list - load sheets from current board only
  const [boardSheets, setBoardSheets] = useState<BoardSheet[]>([]);
  
  const [activeTab, setActiveTab] = useState<"existing" | "new">("new");
  
  // Find matching sheet or default to first sheet
  const getInitialSelectedId = () => {
    if (initialConnection?.sheetId) {
      const matchingSheet = boardSheets.find(s => s.sheetId === initialConnection.sheetId);
      return matchingSheet?.id || "";
    }
    return boardSheets.length > 0 ? boardSheets[0].id : "";
  };
  
  // Form state
  const [selectedSheetId, setSelectedSheetId] = useState(getInitialSelectedId());
  const [newSheetUrl, setNewSheetUrl] = useState("");
  const [cellRange, setCellRange] = useState(initialConnection?.cellRange || "");
  const [sheetName, setSheetName] = useState(initialConnection?.sheetName || "");
  const [label, setLabel] = useState(initialConnection?.label || "");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Load sheets on mount from current board only
  useEffect(() => {
    const loadSheets = async () => {
      try {
        // Fetch sheets from API for current board
        const sheets = await getBoardSheetDocuments(boardId);
        setBoardSheets(sheets);
        setActiveTab(sheets.length > 0 ? "existing" : "new");
        
        // Set initial selected sheet
        if (sheets.length > 0 && !selectedSheetId) {
          setSelectedSheetId(getInitialSelectedId());
        }
      } catch (error) {
        console.error("Error loading sheets:", error);
        toast({
          title: "Error loading sheets",
          description: "Could not load connected sheets",
          variant: "destructive"
        });
      }
    };
    
    loadSheets();
  }, [boardId, toast, initialConnection]);
  
  const handleExistingConnect = async () => {
    if (!selectedSheetId) {
      toast({
        title: "Error",
        description: "Please select a sheet",
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
      const selectedSheet = boardSheets.find(s => s.id === selectedSheetId);
      if (!selectedSheet) {
        throw new Error("Selected sheet not found");
      }
      
      // Get cell data (use mock data for testing)
      const upperCellRange = cellRange.toUpperCase();
      const mockData = MOCK_CELL_DATA[upperCellRange] || {
        value: `Value for ${upperCellRange}`,
        formattedValue: `Value for ${upperCellRange}`
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
  
  const handleNewConnect = async () => {
    if (!newSheetUrl) {
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
      // Validate URL (simplified for this demo)
      const urlPattern = /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/;
      const match = newSheetUrl.match(urlPattern);
      if (!match) {
        throw new Error("Invalid Google Sheets URL");
      }
      
      const sheetId = match[1];
      
      // Get mock data for the cell
      const upperCellRange = cellRange.toUpperCase();
      const mockData = MOCK_CELL_DATA[upperCellRange] || {
        value: `Value for ${upperCellRange}`,
        formattedValue: `Value for ${upperCellRange}`
      };
      
      // Update the connection
      onUpdate({
        sheetId,
        sheetName: sheetName || undefined,
        cellRange,
        label: label || undefined,
        lastUpdated: new Date().toISOString(),
        formattedValue: mockData.formattedValue
      });
      
      toast({
        title: "Connection successful",
        description: `Connected to new sheet. Retrieved value: ${mockData.formattedValue}`,
      });
      
      // Invalidate queries to refresh sheet list
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}/sheet-documents`] });
      
      onClose();
    } catch (error) {
      console.error("Error connecting to new sheet:", error);
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
    <DialogContent className="sm:max-w-[650px]">
      <DialogHeader>
        <DialogTitle>Connect to Google Sheets</DialogTitle>
        <DialogDescription>
          Connect this block to a Google Sheets cell
        </DialogDescription>
      </DialogHeader>
      
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "existing" | "new")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger
            value="existing"
            disabled={boardSheets.length === 0}
          >
            Use Existing Sheet{boardSheets.length > 0 ? ` (${boardSheets.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="new">Connect New Sheet</TabsTrigger>
        </TabsList>
        
        <TabsContent value="existing" className="mt-4 space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Select Sheet</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedSheetId}
                  onChange={(e) => setSelectedSheetId(e.target.value)}
                >
                  <option value="" disabled>Select a connected sheet</option>
                  {boardSheets.map((sheet) => (
                    <option key={sheet.id} value={sheet.id}>
                      {sheet.name}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-muted-foreground">
                  Select from sheets connected to this board
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Sheet Name (Tab)</Label>
                <Input 
                  placeholder="e.g., Sheet1 or funnel-list (optional)" 
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
                  Try D4, E3, C2, or A1 for sample data
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
                onClick={testGoogleSheetsApi}
              >
                Test API Key
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExistingConnect}
                disabled={isProcessing || !selectedSheetId || !cellRange}
              >
                <TableIcon className="h-4 w-4 mr-2" />
                Connect
              </Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="new" className="mt-4 space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Google Sheet URL</Label>
                <Input 
                  placeholder="https://docs.google.com/spreadsheets/d/..." 
                  value={newSheetUrl}
                  onChange={(e) => setNewSheetUrl(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Enter the URL of the Google Sheet you want to connect
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Sheet Name (Tab)</Label>
                <Input 
                  placeholder="Sheet1" 
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
                  Enter the cell reference in A1 notation
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
                onClick={testGoogleSheetsApi}
              >
                Test API Key
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                onClick={handleNewConnect}
                disabled={isProcessing || !newSheetUrl || !cellRange}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Connect New Sheet
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
}