import { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { TableIcon, X } from 'lucide-react';
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
  
  // If we don't have connection data, show placeholder state
  if (!connectionData.sheetId || !connectionData.cellRange) {
    return (
      <>
        <div 
          className={`w-full h-full flex flex-col items-center justify-center cursor-pointer ${className} hover:bg-gray-50 transition-colors`}
          onClick={() => setIsDialogOpen(true)}
        >
          <div className="flex items-center text-gray-400 text-sm font-medium">
            <TableIcon className="w-4 h-4 mr-2" />
            Connect a sheet
          </div>
        </div>

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
      <Card className={`w-full h-full overflow-hidden ${className}`}>
        <CardContent className="p-4 relative h-full flex flex-col overflow-hidden">
          {/* Label centered at top with padding - only show if label exists */}
          {connectionData.label && (
            <div className="text-center pt-2 pb-4">
              <div className="text-sm font-normal text-black">{connectionData.label}</div>
            </div>
          )}
          
          {/* Large centered value - both horizontally and vertically */}
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <div className="text-2xl font-bold text-black text-center max-w-full truncate">
              {connectionData.value || '0'}
            </div>
          </div>
          

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