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
  
  // Handle sheet selection
  const handleSheetSelection = (data: SheetsConnectionData) => {
    console.log("Sheet data selected:", data);
    
    // Close the dialog first
    setIsDialogOpen(false);
    
    // Add a small delay to make sure the dialog is completely closed
    setTimeout(() => {
      try {
        // First update our local state
        setConnectionData(prev => {
          // Create a clean copy that preserves any existing data
          return { ...prev, ...data };
        });
        
        // Then notify the parent
        onUpdate(data);
      } catch (err) {
        console.error("Error updating connection:", err);
      }
    }, 150);
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
            initialData={connectionData}
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
          initialData={connectionData}
        />
      )}
    </>
  );
});