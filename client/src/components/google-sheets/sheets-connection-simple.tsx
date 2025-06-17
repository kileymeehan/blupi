import { useState, useEffect } from "react";
import * as z from "zod";
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
import { useToast } from "@/hooks/use-toast";
import { TableIcon, RefreshCwIcon } from "lucide-react";

import { validateSheetUrl, getBoardSheetDocuments, fetchSheetCell } from "@/services/google-sheets-api";

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
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [boardSheets, setBoardSheets] = useState<BoardSheet[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Form state
  const [sheetUrl, setSheetUrl] = useState(
    initialConnection?.sheetId ? `https://docs.google.com/spreadsheets/d/${initialConnection.sheetId}/edit` : ''
  );
  const [cellRange, setCellRange] = useState(initialConnection?.cellRange || '');
  const [sheetName, setSheetName] = useState(initialConnection?.sheetName || '');
  const [label, setLabel] = useState(initialConnection?.label || '');
  
  // For existing sheet
  const [selectedSheetId, setSelectedSheetId] = useState('');
  const [existingCellRange, setExistingCellRange] = useState(initialConnection?.cellRange || '');
  const [existingSheetName, setExistingSheetName] = useState(initialConnection?.sheetName || '');
  const [existingLabel, setExistingLabel] = useState(initialConnection?.label || '');
  
  // Default to 'existing' if there are sheets available
  const [activeTab, setActiveTab] = useState<string>('new');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Load board sheets on mount
  useEffect(() => {
    const fetchBoardSheets = async () => {
      if (!boardId) {
        console.warn('No boardId provided to SheetsConnectionDialog');
        return;
      }
      
      setLoadingSheets(true);
      try {
        // For board 22, we know we have sheet connections
        // This is a special case to ensure we always see the connections
        let sheets;
        if (boardId === 22) {
          console.log('Special handling for board 22');
          sheets = await getBoardSheetDocuments(22);
        } else {
          sheets = await getBoardSheetDocuments(boardId);
        }
        console.log(`Found ${sheets.length} sheets for board ${boardId}`);
        
        setBoardSheets(sheets);
        
        // If there are sheets, default to 'existing' tab
        if (sheets.length > 0) {
          setActiveTab('existing');
          
          // If we have an initialConnection, try to find that sheet
          if (initialConnection?.sheetId) {
            const matchingSheet = sheets.find(s => s.sheetId === initialConnection.sheetId);
            if (matchingSheet) {
              setSelectedSheetId(matchingSheet.id);
            } else if (sheets.length > 0) {
              setSelectedSheetId(sheets[0].id);
            }
          } else if (sheets.length > 0) {
            setSelectedSheetId(sheets[0].id);
          }
        }
      } catch (error) {
        console.error('Error loading board sheet documents:', error);
        toast({
          title: 'Error',
          description: 'Failed to load board sheet documents',
          variant: 'destructive',
        });
      } finally {
        setLoadingSheets(false);
      }
    };
    
    fetchBoardSheets();
  }, [boardId, initialConnection, toast]);
  
  // Refresh sheet list
  const refreshSheets = async () => {
    setLoadingSheets(true);
    try {
      const sheets = await getBoardSheetDocuments(boardId);
      setBoardSheets(sheets);
      
      if (sheets.length > 0 && !selectedSheetId) {
        setSelectedSheetId(sheets[0].id);
      }
      
      toast({
        title: "Sheet list refreshed",
        description: `Found ${sheets.length} sheets for this board`,
      });
    } catch (error) {
      console.error('Error refreshing sheets:', error);
      toast({
        title: "Refresh failed",
        description: "Failed to refresh sheet list",
        variant: "destructive",
      });
    } finally {
      setLoadingSheets(false);
    }
  };
  
  // Handle connecting with a new sheet
  const handleNewConnection = async () => {
    if (!sheetUrl) {
      toast({
        title: "Error",
        description: "Please enter a Google Sheets URL",
        variant: "destructive",
      });
      return;
    }
    
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
      // Validate the sheet URL
      const validationResult = await validateSheetUrl(sheetUrl);
      if (!validationResult.valid) {
        toast({
          title: "Invalid URL",
          description: validationResult.message || "Please enter a valid Google Sheets URL",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }
      
      // Show processing toast
      toast({
        title: "Processing",
        description: "Connecting to Google Sheets and fetching data...",
      });
      
      // Fetch the cell data
      const cellData = await fetchSheetCell(
        validationResult.sheetId!,
        cellRange,
        sheetName || undefined
      );
      
      // Update the connection
      onUpdate({
        sheetId: validationResult.sheetId!,
        sheetName: sheetName || undefined,
        cellRange,
        label: label || undefined,
        lastUpdated: new Date().toISOString(),
        formattedValue: cellData?.formattedValue || cellData?.value || ''
      });
      
      toast({
        title: "Connection successful",
        description: `Connected to sheet. Retrieved value: ${cellData?.formattedValue || cellData?.value || 'N/A'}`,
      });
      
      // Invalidate board sheets query to refresh the list
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}/sheet-documents`] });
      
      onClose();
    } catch (error) {
      console.error('Error connecting to sheet:', error);
      toast({
        title: "Connection failed",
        description: String(error).includes("Too Many Requests") 
          ? "Google Sheets API rate limit reached. Please try again in a minute."
          : String(error),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle connecting with an existing sheet
  const handleExistingConnection = async () => {
    if (!selectedSheetId) {
      toast({
        title: "Error",
        description: "Please select a sheet",
        variant: "destructive",
      });
      return;
    }
    
    if (!existingCellRange) {
      toast({
        title: "Error",
        description: "Cell reference is required",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const selectedSheet = boardSheets.find(s => s.id === selectedSheetId);
      if (!selectedSheet) {
        toast({
          title: "Error",
          description: "Selected sheet not found",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }
      
      // Show processing toast
      toast({
        title: "Processing",
        description: "Connecting and fetching data...",
      });
      
      // Fetch the cell data
      let cellData;
      
      // Special case for test sheet
      if (selectedSheet.sheetId === "1zW6Tru8P0dBGTzI0UvQnOgJR5BQ-nldCQsvdmD-lLPU") {
        console.log("Using mock data for Test sheet:", existingCellRange);
        cellData = await fetchSheetCell(
          selectedSheet.sheetId,
          existingCellRange,
          existingSheetName || undefined
        );
      } else {
        // For other sheets, use normal API call
        cellData = await fetchSheetCell(
          selectedSheet.sheetId,
          existingCellRange,
          existingSheetName || undefined
        );
      }
      
      // Update the connection
      onUpdate({
        sheetId: selectedSheet.sheetId,
        sheetName: existingSheetName || undefined,
        cellRange: existingCellRange,
        label: existingLabel || undefined,
        lastUpdated: new Date().toISOString(),
        formattedValue: cellData?.formattedValue || cellData?.value || ''
      });
      
      toast({
        title: "Connection successful",
        description: `Connected to ${selectedSheet.name}. Retrieved value: ${cellData?.formattedValue || cellData?.value || 'N/A'}`,
      });
      
      onClose();
    } catch (error) {
      console.error('Error connecting to sheet:', error);
      toast({
        title: "Connection failed",
        description: String(error).includes("Too Many Requests") 
          ? "Google Sheets API rate limit reached. Please try again in a minute."
          : String(error),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Connect to Google Sheets</DialogTitle>
        <DialogDescription>
          Connect this block to a Google Sheets cell
        </DialogDescription>
      </DialogHeader>
      
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="mt-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger 
            value="existing" 
            disabled={boardSheets.length === 0}
          >
            Use Existing Sheet {boardSheets.length > 0 && `(${boardSheets.length})`}
          </TabsTrigger>
          <TabsTrigger value="new">Add New Sheet</TabsTrigger>
        </TabsList>
        
        <TabsContent value="existing" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Select a connected sheet</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshSheets}
              disabled={loadingSheets}
            >
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Sheet Connection</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedSheetId}
                  onChange={(e) => setSelectedSheetId(e.target.value)}
                  disabled={loadingSheets || boardSheets.length === 0}
                >
                  <option value="" disabled>Select a sheet connection</option>
                  {boardSheets.map((sheet) => (
                    <option key={sheet.id} value={sheet.id}>
                      {sheet.name}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-muted-foreground">
                  Select a sheet connection from this board
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Sheet Name (Tab)</Label>
                <Input 
                  placeholder="e.g., Sheet1 or funnel-list (optional)" 
                  value={existingSheetName}
                  onChange={(e) => setExistingSheetName(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Enter the sheet tab name (optional)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Cell Reference</Label>
                <Input 
                  placeholder="e.g., A1 or B2" 
                  value={existingCellRange}
                  onChange={(e) => setExistingCellRange(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Enter the cell reference in A1 notation
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Label (Optional)</Label>
                <Input 
                  placeholder="e.g., Monthly Revenue" 
                  value={existingLabel}
                  onChange={(e) => setExistingLabel(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  A label for this metric
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={testGoogleSheetsApi}
              >
                Test API Key
              </Button>
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleExistingConnection}
                disabled={isProcessing || !selectedSheetId || !existingCellRange}
              >
                <TableIcon className="h-4 w-4 mr-2" />
                Connect
              </Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="new" className="mt-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Google Sheet URL</Label>
                <Input 
                  placeholder="https://docs.google.com/spreadsheets/d/..." 
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Enter the full URL of your Google Sheet
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
                  Enter the sheet name/tab (optional)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Cell Reference</Label>
                <Input 
                  placeholder="e.g., A1 or B2" 
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
                  placeholder="e.g., Monthly Revenue" 
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  A label for this metric
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={testGoogleSheetsApi}
              >
                Test API Key
              </Button>
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleNewConnection}
                disabled={isProcessing || !sheetUrl || !cellRange}
              >
                <TableIcon className="h-4 w-4 mr-2" />
                Connect to Google Sheets
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
}