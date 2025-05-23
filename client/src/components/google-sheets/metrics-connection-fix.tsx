import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getCellValue } from "@/services/google-sheets-api";

// This component provides a safer approach to connecting metric blocks to Google Sheets
// It avoids the white screen issue by properly handling state updates and DOM operations

interface MetricsConnectionProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: number;
  initialData?: {
    sheetId?: string;
    sheetDocName?: string;
    sheetName?: string;
    cellRange?: string;
    label?: string;
  };
  onConnect: (data: {
    sheetId: string;
    sheetName: string;
    cellRange: string;
    label?: string;
    value?: string;
    formattedValue?: string;
    lastUpdated: string;
  }) => void;
  connectedSheets: Array<{
    id: string;
    name: string;
    url: string;
    sheetId: string;
  }>;
}

export function MetricsConnectionFix({
  isOpen,
  onOpenChange,
  boardId,
  initialData,
  onConnect,
  connectedSheets
}: MetricsConnectionProps) {
  const { toast } = useToast();
  
  // Track if we're currently processing a connection
  const isProcessingRef = useRef(false);
  
  // State for the form
  const [selectedSheetId, setSelectedSheetId] = useState<string>(initialData?.sheetId || '');
  const [selectedTab, setSelectedTab] = useState<string>("existing");
  const [sheetName, setSheetName] = useState<string>(initialData?.sheetName || 'Sheet1');
  const [cellRange, setCellRange] = useState<string>(initialData?.cellRange || '');
  const [label, setLabel] = useState<string>(initialData?.label || '');
  const [loading, setLoading] = useState(false);
  
  // Log the initial state and connected sheets for debugging
  React.useEffect(() => {
    console.log("📊 [MetricsConnectionFix] initialData:", initialData);
    console.log("📊 [MetricsConnectionFix] Connected sheets:", connectedSheets);
    
    // Preselect the first sheet if available and none is selected
    if (connectedSheets.length > 0 && !selectedSheetId) {
      setSelectedSheetId(connectedSheets[0].id);
    }
    
    // Pre-populate with initial data if available
    if (initialData) {
      if (initialData.sheetId) {
        setSelectedSheetId(initialData.sheetId);
        setSelectedTab("existing");
      }
      if (initialData.sheetName) {
        setSheetName(initialData.sheetName);
      }
      if (initialData.cellRange) {
        setCellRange(initialData.cellRange);
      }
      if (initialData.label) {
        setLabel(initialData.label);
      }
    }
  }, [initialData, connectedSheets]);
  
  const handleConnect = async () => {
    // Prevent double processing
    if (isProcessingRef.current) {
      console.log("📊 [MetricsConnectionFix] Already processing, ignoring duplicate request");
      return;
    }
    
    try {
      isProcessingRef.current = true;
      setLoading(true);
      
      // Basic validation
      if (!selectedSheetId) {
        toast({
          title: "Error",
          description: "Please select a Google Sheet",
          variant: "destructive",
        });
        isProcessingRef.current = false;
        setLoading(false);
        return;
      }
      
      if (!cellRange) {
        toast({
          title: "Error",
          description: "Cell reference is required",
          variant: "destructive",
        });
        isProcessingRef.current = false;
        setLoading(false);
        return;
      }
      
      // Get the selected sheet
      const selectedSheet = connectedSheets.find(sheet => sheet.id === selectedSheetId);
      if (!selectedSheet) {
        toast({
          title: "Error",
          description: "Selected sheet not found",
          variant: "destructive",
        });
        isProcessingRef.current = false;
        setLoading(false);
        return;
      }
      
      console.log(`📊 [MetricsConnectionFix] Connecting to ${selectedSheet.name}, getting value for ${cellRange}`);
      
      // Format the cell reference to uppercase
      const upperCell = cellRange.toUpperCase();
      
      // Get the value from Google Sheets
      const result = await getCellValue(selectedSheet.sheetId, sheetName, upperCell);
      console.log("📊 [MetricsConnectionFix] Cell value result:", result);
      
      // Prepare connection data
      const connectionData = {
        sheetId: selectedSheet.sheetId,
        sheetName: sheetName,
        cellRange: upperCell,
        label: label,
        value: result.value || "0",
        formattedValue: result.formattedValue || result.value || "0",
        lastUpdated: new Date().toISOString()
      };
      
      // Store data in a local variable for safety
      const finalData = {...connectionData};
      
      console.log("📊 [MetricsConnectionFix] Finalizing connection:", finalData);
      
      // Backup to session storage in case something goes wrong
      sessionStorage.setItem('lastMetricsConnection', JSON.stringify({
        data: finalData,
        timestamp: Date.now()
      }));
      
      // Important: Close dialog FIRST before updating parent state
      onOpenChange(false);
      
      // Then use setTimeout to ensure the dialog is fully unmounted
      // before we update any state that might affect React Beautiful DnD
      setTimeout(() => {
        try {
          onConnect(finalData);
          console.log("📊 [MetricsConnectionFix] Connection successful");
          toast({
            title: "Connection successful",
            description: `Connected to ${finalData.formattedValue}`,
          });
        } catch (error) {
          console.error("Error in final connection step:", error);
          toast({
            title: "Connection Error",
            description: "There was a problem finalizing the connection. Please try again.",
            variant: "destructive"
          });
        } finally {
          isProcessingRef.current = false;
          setLoading(false);
        }
      }, 100);
      
    } catch (error) {
      console.error("Error during connection:", error);
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "Failed to connect to Google Sheets",
        variant: "destructive"
      });
      isProcessingRef.current = false;
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Only allow closing if not currently loading
      if (!loading || !open) {
        onOpenChange(open);
      }
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Connect to Google Sheets</DialogTitle>
        </DialogHeader>
        
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="existing">Use Existing Sheet</TabsTrigger>
          </TabsList>
          
          <TabsContent value="existing" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Sheet</Label>
              {connectedSheets.length > 0 ? (
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedSheetId}
                  onChange={(e) => setSelectedSheetId(e.target.value)}
                >
                  {connectedSheets.map((sheet) => (
                    <option key={sheet.id} value={sheet.id}>
                      {sheet.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-sm text-amber-600 p-2 bg-amber-50 rounded">
                  No sheets connected to this board yet. Please connect a sheet in the sidebar first.
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Sheet Name (Tab)</Label>
              <Input 
                placeholder="Sheet1" 
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The name of the sheet/tab in your Google Sheet (e.g., "Sheet1")
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Cell Reference</Label>
              <Input 
                placeholder="A1"
                value={cellRange}
                onChange={(e) => setCellRange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The cell you want to pull data from (e.g., "A1", "B2")
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Label (Optional)</Label>
              <Input 
                placeholder="Conversion Rate"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A label to display with the metric value
              </p>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={loading || !selectedSheetId || !cellRange}>
            {loading ? "Connecting..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}