import { useState, forwardRef, useImperativeHandle, useEffect } from "react";
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
import { MetricsDialog, type SheetsConnectionData } from './metrics-dialog';

// Define the handle for external components to interact with this one
export interface SimpleMetricsHandle {
  openConnectDialog: () => void;
}

interface SimpleMetricsProps {
  blockId: string;
  boardId: number;
  className?: string;
  initialConnection?: SheetsConnectionData;
  onUpdate: (data: SheetsConnectionData) => void;
}

export const SimpleMetrics = forwardRef<SimpleMetricsHandle, SimpleMetricsProps>(({
  blockId,
  boardId,
  className = '',
  initialConnection,
  onUpdate
}, ref) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [connectionData, setConnectionData] = useState<SheetsConnectionData>(initialConnection || {});
  
  // Update connectionData when initialConnection changes
  useEffect(() => {
    if (initialConnection) {
      setConnectionData(initialConnection);
    }
  }, [initialConnection]);
  
  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    openConnectDialog: () => {
      console.log("Opening dialog via ref for block", blockId);
      setIsDialogOpen(true);
    }
  }));
  
  // Handle sheet selection - using async pattern to properly handle state
  const handleSheetSelection = async (data: SheetsConnectionData) => {
    console.log("Sheet data selected:", data);
    
    try {
      // First update the local state so UI updates immediately
      setConnectionData(data);
      
      // Close the dialog before updating parent state to avoid any conflicting DOM updates
      setIsDialogOpen(false);
      
      // Wait briefly to ensure dialog transition is complete before updating parent
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Now it's safe to update the parent component with our data
      onUpdate(data);
      
    } catch (error) {
      console.error("Error handling sheet selection:", error);
      // Still update local state even if there's an error
      setConnectionData(data);
    }
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
          <MetricsDialog
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
        <MetricsDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onComplete={handleSheetSelection}
          boardId={boardId}
        />
      )}
    </>
  );
});