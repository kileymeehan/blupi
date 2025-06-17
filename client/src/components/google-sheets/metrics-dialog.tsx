import { useState, useEffect } from "react";
import { TableIcon, RefreshCw, Clock } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  getBoardSheetDocuments, 
  getSheetTabs,
  createSheetDocument,
  getCellValue
} from '@/services/google-sheets-api';

// Sheet document type
interface SheetDocument {
  id: string;
  name: string;
  sheetId: string;
  boardId: number;
  createdAt: string;
  updatedAt: string;
  sheets?: string[]; // Available sheet/tab names
}

// Predefined sheet tabs for testing when API is unavailable
// Use minimal defaults to avoid misleading users
const DEFAULT_SHEET_TABS = ["Sheet1"];

// Predefined cell data values for demonstration
const CELL_VALUES: Record<string, Record<string, string>> = {
  "D4": { "value": "3,809", "formatted": "3,809 users" },
  "E3": { "value": "55%", "formatted": "55%" },
  "C2": { "value": "11,096", "formatted": "$11,096" },
  "A1": { "value": "Step 1", "formatted": "Step 1" },
  "B5": { "value": "2,742", "formatted": "2,742 conversions" },
  "G7": { "value": "84.3%", "formatted": "84.3%" },
  "J10": { "value": "$4,200", "formatted": "$4,200" },
  "K12": { "value": "12.5", "formatted": "12.5 days" },
  "H3": { "value": "Yes", "formatted": "Yes" },
  "F9": { "value": "No", "formatted": "No" }
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
  boardId,
  initialData
}: MetricsDialogProps & { initialData?: SheetsConnectionData }) {
  const [sheetDocuments, setSheetDocuments] = useState<SheetDocument[]>([]);
  const [selectedSheetDoc, setSelectedSheetDoc] = useState<string | "new">("new");
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  // Ensure cell reference and label persist properly
  const [cell, setCell] = useState("");
  const [label, setLabel] = useState("");
  
  // Force setting cell and label whenever dialog opens or initial data changes
  useEffect(() => {
    console.log("📊 [Metrics Dialog] Setting initial cell and label:", initialData?.cellRange, initialData?.label);
    if (isOpen) {
      if (initialData?.cellRange) {
        setCell(initialData.cellRange);
      }
      if (initialData?.label) {
        setLabel(initialData.label);
      }
      if (initialData?.sheetId) {
        // Try to find and select the existing sheet
        const existingSheet = sheetDocuments.find(doc => doc.sheetId === initialData.sheetId);
        if (existingSheet) {
          setSelectedSheetDoc(existingSheet.id);
          if (initialData.sheetName) {
            setSelectedSheet(initialData.sheetName);
          }
        }
      }
    }
  }, [initialData, isOpen, sheetDocuments]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Used to force refresh
  const [error, setError] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const { toast } = useToast();
  
  // Auto-refresh timer - will refresh connected data every 5 minutes
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (autoRefreshEnabled && initialData?.sheetId && initialData?.cellRange && initialData?.sheetName) {
      console.log('Setting up auto-refresh for sheet connection');
      intervalId = setInterval(() => {
        if (initialData.sheetId && initialData.sheetName && initialData.cellRange) {
          refreshSheetData(initialData.sheetId, initialData.sheetName, initialData.cellRange);
        }
      }, 10 * 60 * 1000); // 10 minutes
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefreshEnabled, initialData]);
  
  // Function to refresh sheet data
  const refreshSheetData = async (sheetId: string, sheetName: string, cellRange: string) => {
    try {
      console.log(`Auto-refreshing data for ${sheetName} - ${cellRange}`);
      const result = await getCellValue(sheetId, sheetName, cellRange);
      
      if (result && result.value) {
        console.log(`Refreshed value: ${result.value}`);
        
        // Prepare refreshed connection data
        const refreshedData = {
          sheetId,
          cellRange,
          value: result.value,
          formattedValue: result.formattedValue || result.value,
          label: initialData?.label,
          sheetName,
          lastUpdated: new Date().toISOString()
        };
        
        // Update the connected block with refreshed data
        onComplete(refreshedData);
        
        toast({
          title: "Sheet data refreshed",
          description: `Updated value: ${result.formattedValue || result.value}`,
        });
      }
    } catch (error) {
      console.error("Error refreshing sheet data:", error);
      toast({
        title: "Refresh failed",
        description: "Could not refresh sheet data",
        variant: "destructive"
      });
    }
  };

  // Get the current sheet document 
  const currentSheetDoc = selectedSheetDoc === "new" ? null : 
    sheetDocuments.find(s => s.id === selectedSheetDoc);
  
  // State for new sheet connection
  const [newSheetUrl, setNewSheetUrl] = useState("");
  const [newSheetName, setNewSheetName] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Initialize form with existing connection data when it's available
  useEffect(() => {
    if (initialData && sheetDocuments.length > 0) {
      console.log('Setting selected sheet from initialData:', initialData);
      
      // Set sheet if we can find it
      if (initialData.sheetId) {
        const matchingDoc = sheetDocuments.find(doc => doc.sheetId === initialData.sheetId);
        if (matchingDoc) {
          console.log('Found matching sheet doc:', matchingDoc.name);
          setSelectedSheetDoc(matchingDoc.id);
          setSelectedSheet(initialData.sheetName || "Sheet1");
        }
      }
    }
  }, [initialData, sheetDocuments]);
  
  // Function to refresh the sheet list
  const refreshSheets = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };
  
  // Fetch connected sheets when dialog opens or refresh is triggered
  useEffect(() => {
    // Load sheets when dialog opens
    if (isOpen) {
      loadConnectedSheets();
    }
  }, [isOpen, boardId]);
  
  // Added separate effect for manual refresh only
  useEffect(() => {
    if (refreshKey > 0 && isOpen) {
      loadConnectedSheets();
    }
  }, [refreshKey]);
  
  // Load connected sheets for this board - CRITICAL FIX for sheet loading issues
  const loadConnectedSheets = async () => {
    // Prevent running multiple times
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
      setError("Loading timeout - please try again");
      setSheetDocuments([]);
    }, 10000); // 10 second timeout
    
    try {
      console.log(`📊 [Metrics Dialog] Loading sheets for board ${boardId}...`);
      
      // Validate board ID
      if (!boardId || boardId === 0) {
        console.error(`📊 [Metrics Dialog] Invalid board ID: ${boardId}`);
        setSheetDocuments([]);
        clearTimeout(loadingTimeout);
        setLoading(false);
        return;
      }
      
      // Load sheets from the current board with timeout
      let currentBoardSheets: any[] = [];
      try {
        const controller = new AbortController();
        const fetchTimeout = setTimeout(() => controller.abort(), 8000); // 8 second fetch timeout
        
        const response = await fetch(`/api/boards/${boardId}/sheet-documents?t=${Date.now()}`, {
          signal: controller.signal
        });
        clearTimeout(fetchTimeout);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch sheets: ${response.status} ${response.statusText}`);
        }
        
        currentBoardSheets = await response.json();
        
        console.log(`📊 [Metrics Dialog] Found ${currentBoardSheets.length} sheets in current board ${boardId}:`, 
          currentBoardSheets.map((s: any) => s.name).join(', '));
        
        setSheetDocuments(currentBoardSheets);
      } catch (boardErr: any) {
        console.error(`📊 [Metrics Dialog] Error loading sheets from current board ${boardId}:`, boardErr);
        if (boardErr?.name === 'AbortError') {
          setError("Request timeout - please try again");
        }
        setSheetDocuments([]);
        currentBoardSheets = [];
      }
      
      // Log our combined sheet collection
      console.log(`📊 [Metrics Dialog] Combined total: ${currentBoardSheets.length} sheets available for connection`);
      
      if (currentBoardSheets.length > 0) {
        // Add sheet tabs to each document
        const sheetsWithTabs = await Promise.all(
          currentBoardSheets.map(async (sheet: SheetDocument) => {
            try {
              console.log(`📊 [Metrics Dialog] Fetching tabs for sheet: ${sheet.name} (${sheet.sheetId})`);
              
              // Let the API service handle special cases
              const tabs = await getSheetTabs(sheet.sheetId);
              console.log(`📊 [Metrics Dialog] Got ${tabs.length} tabs for sheet ${sheet.name}`);
              return { ...sheet, sheets: tabs };
            } catch (err: any) {
              console.warn(`📊 [Metrics Dialog] Error fetching tabs for sheet ${sheet.id}`, err);
              
              // Check if it's a permission error
              if (err?.message?.includes('Permission denied') || err?.message?.includes('publicly accessible')) {
                setError(`Sheet "${sheet.name}" requires public access. Please set sharing to "Anyone with the link can view" in Google Sheets.`);
                return { ...sheet, sheets: DEFAULT_SHEET_TABS, hasPermissionError: true };
              }
              
              console.log(`📊 [Metrics Dialog] Using default tabs for sheet ${sheet.name}`);
              return { ...sheet, sheets: DEFAULT_SHEET_TABS };
            }
          })
        );
        
        // Sort sheets alphabetically by name for easier selection
        sheetsWithTabs.sort((a: any, b: any) => a.name.localeCompare(b.name));
        
        console.log('📊 [Metrics Dialog] Final sheet collection:', sheetsWithTabs.map((s: any) => s.name));
        
        // CRITICAL: Make sure we actually set the state with the loaded sheets - this is key!
        setSheetDocuments(sheetsWithTabs);
        
        // If we have sheets, select the first one by default unless we're already in new mode
        if (sheetsWithTabs.length > 0 && (selectedSheetDoc === "new" || selectedSheetDoc === "")) {
          console.log(`📊 [Metrics Dialog] Setting default selected sheet to: ${sheetsWithTabs[0].name}`);
          setSelectedSheetDoc(sheetsWithTabs[0].id);
          setSelectedSheet(sheetsWithTabs[0].sheets?.[0] || "Sheet1");
        }
      } else {
        // No sheets connected, default to "new" state
        console.log('📊 [Metrics Dialog] No sheets found at all, defaulting to "new" state');
        setSelectedSheetDoc("new");
        setSheetDocuments([]);
      }
    } catch (err) {
      console.error("📊 [Metrics Dialog] Error loading connected sheets:", err);
      setError("Failed to load connected sheets - please try again");
      
      // Default to "new" state if there's an error
      setSelectedSheetDoc("new");
      setSheetDocuments([]);
    } finally {
      clearTimeout(loadingTimeout);
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!cell) {
      toast({
        title: "Error",
        description: "Please enter a cell reference",
        variant: "destructive"
      });
      return;
    }
    
    // Handle "New Connection" option
    if (selectedSheetDoc === "new") {
      if (!newSheetUrl) {
        toast({
          title: "Error",
          description: "Please enter a Google Sheets URL",
          variant: "destructive"
        });
        return;
      }

      if (!newSheetName) {
        toast({
          title: "Error",
          description: "Please enter a name for this sheet",
          variant: "destructive"
        });
        return;
      }

      setIsConnecting(true);
      setError(null);
      
      try {
        // Extract the sheet ID from the URL
        const matches = newSheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        const sheetId = matches && matches[1] ? matches[1] : newSheetUrl;
        
        // Create the new sheet document via API
        const newDoc = await createSheetDocument(boardId, newSheetName, newSheetUrl);
        
        // Add the new sheet to our state (with default tabs for now)
        const newDocWithTabs = {
          ...newDoc,
          sheets: ["Sheet1", "Data"]
        };
        
        // Prepare connection data
        const connectionData = {
          sheetId: newDoc.sheetId,
          cellRange: cell.toUpperCase(),
          value: "Loading...",
          formattedValue: "Loading...",
          label: label || undefined,
          sheetName: "Sheet1",
          lastUpdated: new Date().toISOString()
        };
        
        // Success message
        toast({
          title: "Sheet Connected",
          description: `Successfully connected to "${newSheetName}"`,
        });
        
        // Log final data for debugging
        console.log("📊 [Metrics Dialog] New sheet connection data with cell:", connectionData.cellRange, "and label:", connectionData.label);
        
        // Update state
        setSheetDocuments(prev => [...prev, newDocWithTabs]);
        setSelectedSheetDoc(newDoc.id);
        setSelectedSheet("Sheet1");
        setNewSheetUrl("");
        setNewSheetName("");
        
        // Create a deep copy of the connection data
        const safeConnectionData = JSON.parse(JSON.stringify(connectionData));
        
        console.log("📊 [Metrics Dialog] New sheet connection data prepared:", safeConnectionData);
        
        // Import our safer utility function
        const { safelyCompleteConnection } = await import('@/utils/safe-sheets-connection');
        
        // Use our safer approach to complete the connection
        safelyCompleteConnection(
          safeConnectionData,
          onClose,
          (data) => {
            console.log("📊 [Metrics Dialog] New sheet connection completed safely");
            onComplete(data);
          }
        );
        
      } catch (err) {
        console.error("Error connecting sheet:", err);
        setError(err instanceof Error ? err.message : "Failed to connect sheet");
        
        toast({
          title: "Error",
          description: "Failed to connect the sheet",
          variant: "destructive"
        });
      } finally {
        setIsConnecting(false);
      }
      
      return;
    }
    
    if (!currentSheetDoc) {
      toast({
        title: "Error",
        description: "Please select a sheet document",
        variant: "destructive"
      });
      return;
    }
    
    const upperCell = cell.toUpperCase();
    
    // Set loading state
    setLoading(true);
      
    try {
      // Actually fetch the real data from the Google Sheet
      console.log(`📊 [Metrics Dialog] Fetching value for cell ${upperCell} from sheet ${selectedSheet} (ID: ${currentSheetDoc.sheetId})`);
      
      // Try to get the actual value from the API
      const result = await getCellValue(currentSheetDoc.sheetId, selectedSheet, upperCell);
      console.log(`📊 [Metrics Dialog] Raw API result:`, result);
      
      const cellData = { 
        value: result.value || "0", 
        formatted: result.formattedValue || result.value || "0" 
      };
      console.log(`📊 [Metrics Dialog] Successfully retrieved cell value:`, cellData);
      
      // Prepare connection data 
      const connectionData = {
        sheetId: currentSheetDoc.sheetId,
        cellRange: upperCell,
        value: cellData.value,
        formattedValue: cellData.formatted,
        label: label || undefined,
        sheetName: selectedSheet,
        lastUpdated: new Date().toISOString()
      };
      
      // Show success message
      toast({
        title: "Connection successful",
        description: `Retrieved value: ${cellData.formatted}`,
      });
      
      // Log final data for debugging
      console.log("📊 [Metrics Dialog] Final connection data with cell:", connectionData.cellRange, "and label:", connectionData.label);
      
      // First store the connection data we want to pass back
      const finalConnectionData = {...connectionData};
      
      // Log exactly what we're returning to help with debugging
      console.log("📊 [Metrics Dialog] Final connection data:", finalConnectionData);
      
      // Import our new safer connection utility
      // Don't worry about importing at the top - destructuring here works inline
      const { safelyCompleteConnection } = await import('@/utils/safe-sheets-connection');
      
      // Create a deep copy of the data to ensure it persists
      const safeConnectionData = JSON.parse(JSON.stringify(finalConnectionData));
      
      console.log("📊 [Metrics Dialog] Using safer connection method", safeConnectionData);
      
      // Use our utility function to safely handle the connection
      // This prevents white screen by properly handling the timing of operations
      safelyCompleteConnection(
        safeConnectionData,
        onClose,
        (data) => {
          console.log("📊 [Metrics Dialog] Safely completed connection");
          onComplete(data);
        }
      );
    } catch (err: any) {
      console.error("Error connecting to Google Sheet:", err);
      setLoading(false);
      setIsConnecting(false);
      
      // Provide specific error messages based on the error type
      let errorMessage = "There was a problem connecting to the sheet. Please try again.";
      
      if (err?.message?.includes('Permission denied') || err?.message?.includes('publicly accessible')) {
        errorMessage = "This Google Sheet requires public access. Please set sharing to 'Anyone with the link can view' in Google Sheets, then try again.";
      } else if (err?.message?.includes('not found') || err?.message?.includes('404')) {
        errorMessage = "Sheet not found. Please check the URL and ensure the sheet exists.";
      } else if (err?.message?.includes('rate limit') || err?.message?.includes('quota')) {
        errorMessage = "Google Sheets API rate limit reached. Please wait a few minutes before trying again.";
      }
      
      toast({
        title: "Connection error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Connect to Google Sheets</DialogTitle>
          <DialogDescription>Connect this block to a Google Sheets cell</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="sheetDoc">Select Google Sheet</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={refreshSheets} 
                disabled={loading}
                className="h-6 px-2"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                <span className="ml-1 text-xs">Refresh</span>
              </Button>
            </div>
            <select
              id="sheetDoc"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedSheetDoc}
              onChange={(e) => {
                setSelectedSheetDoc(e.target.value);
                if (e.target.value !== "new") {
                  const doc = sheetDocuments.find(s => s.id === e.target.value);
                  if (doc && doc.sheets && doc.sheets.length > 0) {
                    setSelectedSheet(doc.sheets[0]);
                  }
                }
              }}
              disabled={loading}
            >
              {sheetDocuments.length > 0 ? (
                sheetDocuments.map(sheet => (
                  <option key={sheet.id} value={sheet.id}>{sheet.name}</option>
                ))
              ) : (
                <option value="" disabled>No sheets available</option>
              )}
              <option value="new">+ Connect New Sheet</option>
            </select>
            {loading && (
              <p className="text-xs text-muted-foreground">Loading sheet connections...</p>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-2">
                <p className="text-sm text-red-700">{error}</p>
                {error.includes('public access') && (
                  <div className="mt-2 text-xs text-red-600">
                    <p className="font-medium">To fix this:</p>
                    <ol className="list-decimal list-inside mt-1 space-y-1">
                      <li>Open your Google Sheet</li>
                      <li>Click "Share" in the top right</li>
                      <li>Click "Anyone with the link" can "View"</li>
                      <li>Click "Done" then try connecting again</li>
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {selectedSheetDoc === "new" ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="newSheetUrl">Google Sheets URL</Label>
                <Input
                  id="newSheetUrl"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={newSheetUrl}
                  onChange={(e) => setNewSheetUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Paste the full URL to your Google Sheet
                </p>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="newSheetName">Sheet Name</Label>
                <Input
                  id="newSheetName"
                  placeholder="e.g., Q2 Marketing Metrics"
                  value={newSheetName}
                  onChange={(e) => setNewSheetName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Give this sheet a descriptive name
                </p>
              </div>
            </>
          ) : currentSheetDoc && (
            <div className="grid gap-2">
              <Label htmlFor="sheetTab">Select Sheet Tab</Label>
              <select
                id="sheetTab"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedSheet}
                onChange={(e) => setSelectedSheet(e.target.value)}
              >
                {currentSheetDoc.sheets && currentSheetDoc.sheets.length > 0 ? (
                  currentSheetDoc.sheets.map(sheet => (
                    <option key={sheet} value={sheet}>{sheet}</option>
                  ))
                ) : (
                  <option value="Sheet1">Sheet1</option>
                )}
              </select>
            </div>
          )}
          
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
        
        <div className="mt-4 px-1">
          {initialData?.sheetId && (
            <div className="flex items-center justify-between mb-4 p-2 border rounded-md bg-gray-50">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-600" />
                <Label htmlFor="auto-refresh" className="text-sm font-medium">
                  Auto-refresh values every 5 minutes
                </Label>
              </div>
              <Switch
                id="auto-refresh"
                checked={autoRefreshEnabled}
                onCheckedChange={setAutoRefreshEnabled}
              />
            </div>
          )}
          
          {initialData?.sheetId && initialData?.cellRange && (
            <div className="mb-4 p-2 border rounded-md bg-blue-50">
              <div className="text-sm text-blue-700 flex items-center justify-between">
                <span>Currently connected to: <strong>{initialData.sheetName || 'Sheet1'} - {initialData.cellRange}</strong></span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (initialData?.sheetId && initialData?.sheetName && initialData?.cellRange) {
                      refreshSheetData(initialData.sheetId, initialData.sheetName, initialData.cellRange);
                    }
                  }}
                  className="px-2 h-7"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              </div>
              {initialData.lastUpdated && (
                <div className="text-xs text-gray-500 mt-1">
                  Last updated: {new Date(initialData.lastUpdated).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || isConnecting}>
            <TableIcon className="h-4 w-4 mr-2" />
            {loading || isConnecting ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}