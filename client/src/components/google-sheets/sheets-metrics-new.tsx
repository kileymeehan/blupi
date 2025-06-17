import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { TableIcon, ExternalLinkIcon, LinkIcon, FileTextIcon } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Dialog } from "@/components/ui/dialog";
import { fetchSheetCell } from '../../services/google-sheets-api';
import { useToast } from '@/hooks/use-toast';
import { SheetsConnectionDialog } from './sheets-stable-dialog';

interface SheetsMetricsProps {
  blockId: string;
  boardId: number;
  className?: string;
  initialConnection?: {
    sheetId: string;
    sheetName?: string;
    cellRange: string;
    label?: string;
    lastUpdated?: string;
    formattedValue?: string;
  };
  onUpdate: (connection: {
    sheetId: string;
    sheetName?: string;
    cellRange: string;
    label?: string;
    lastUpdated: string;
    formattedValue?: string;
  }) => void;
}

export interface SheetsMetricsHandle {
  openConnectDialog: () => void;
}

export const SheetsMetrics = forwardRef<SheetsMetricsHandle, SheetsMetricsProps>((props, ref) => {
  const { 
    blockId, 
    boardId, 
    className = '', 
    initialConnection,
    onUpdate
  } = props;
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    openConnectDialog: () => setIsConnectDialogOpen(true)
  }));
  
  // Function to test the Google Sheets API connection
  const testGoogleSheetsApi = async () => {
    try {
      const response = await fetch('/api/google-sheets/test');
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Google API Key Check",
          description: `API key is configured: ${data.keyHint}`,
        });
      } else {
        toast({
          title: "Google API Key Error",
          description: data.message || "API key is not configured properly.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error testing Google Sheets API:', error);
      toast({
        title: "Connection Error",
        description: "Could not connect to the Google Sheets API test endpoint.",
        variant: "destructive",
      });
    }
  };
  
  // Fetch cell data if we have a connection
  const { 
    data: cellData, 
    isLoading, 
    isError,
    error 
  } = useQuery({
    queryKey: ['/api/google-sheets/cell', initialConnection?.sheetId, initialConnection?.cellRange, initialConnection?.sheetName],
    queryFn: async () => {
      if (!initialConnection?.sheetId || !initialConnection?.cellRange) {
        return null;
      }
      return await fetchSheetCell(
        initialConnection.sheetId,
        initialConnection.cellRange,
        initialConnection.sheetName
      );
    },
    enabled: !!initialConnection?.sheetId && !!initialConnection?.cellRange,
    refetchInterval: 30 * 60 * 1000, // Refetch every 30 minutes
  });
  
  // Update the block content when cell data changes
  useEffect(() => {
    if (cellData && initialConnection && onUpdate && 
        (!initialConnection.formattedValue || initialConnection.formattedValue !== (cellData.formattedValue || cellData.value))) {
      console.log('Cell data changed, updating block:', blockId);
      
      // Update the connection with the latest data (including the content value)
      // Make sure we handle null values correctly
      const formattedValue = cellData.formattedValue || cellData.value || '';
      
      const updatedConnection = {
        ...initialConnection,
        lastUpdated: new Date().toISOString(),
        // Add the value as a hidden field to be used by the block
        formattedValue // This is guaranteed to be a string now
      };
      
      // Update the connection (this will trigger the parent to update the block)
      onUpdate(updatedConnection);
    }
  }, [cellData, initialConnection, onUpdate, blockId]);

  // Handle errors
  if (isError && error) {
    console.error('Error fetching cell data:', error);
  }
  
  // Loading state
  if (isLoading) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <TableIcon className="h-3 w-3 mr-1" />
            Google Sheets Metric
          </CardTitle>
          <CardDescription className="text-xs">Loading data...</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not connected state
  if (!initialConnection?.sheetId) {
    return (
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
          <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full"
              id={`sheets-connect-button-${blockId}`}
              data-testid="sheets-connect-trigger"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Opening connection dialog for metrics box. BoardId:', boardId);
                // Force a check of the correct board ID if we're working with board 22
                if (Number(boardId) === 22) {
                  console.log('This is board 22, the known sheets should appear.');
                  // Use board ID 22 in the props directly for next component
                }
                setIsConnectDialogOpen(true);
              }}
            >
              <LinkIcon className="h-3 w-3 mr-2" />
              Connect to Google Sheets
            </Button>
            <SheetsConnectionDialog
              boardId={boardId} 
              initialConnection={initialConnection}
              onClose={() => {
                console.log('Closing connection dialog');
                setIsConnectDialogOpen(false);
              }}
              onUpdate={onUpdate}
              testGoogleSheetsApi={testGoogleSheetsApi}
            />
            {/* Adding this line for debugging but don't display in the DOM */}
            <span className="hidden">{`${boardId}`}</span>
          </Dialog>
        </CardContent>
      </Card>
    );
  }
  
  // Connected state - display the fetched data
  const formattedValue = cellData?.formattedValue || cellData?.value || 'Loading...';
  const displayValue = formattedValue;
  const displayLabel = initialConnection.label;
  const isCsvSheet = initialConnection.sheetId.startsWith('csv-');
  
  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center">
            {isCsvSheet ? (
              <>
                <FileTextIcon className="h-3 w-3 mr-1" />
                CSV Data Metric
              </>
            ) : (
              <>
                <TableIcon className="h-3 w-3 mr-1" />
                Google Sheets Metric
              </>
            )}
          </span>
          <Badge 
            variant="outline" 
            className="text-xs font-normal px-1 ml-1 hover:bg-muted cursor-pointer"
            onClick={() => setIsConnectDialogOpen(true)}
          >
            {isCsvSheet ? (
              <FileTextIcon className="h-2.5 w-2.5 mr-1" />
            ) : (
              <TableIcon className="h-2.5 w-2.5 mr-1" />
            )}
            Change
          </Badge>
        </CardTitle>
        {displayLabel && (
          <CardDescription className="text-xs">{displayLabel}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <p className="text-2xl font-semibold">{displayValue}</p>
            </div>
          </div>
          {!isCsvSheet && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Create a URL to the exact cell in Google Sheets
                      const cellRef = initialConnection.cellRange;
                      const cellName = cellRef.includes(':') ? cellRef.split(':')[0] : cellRef;
                      const sheet = initialConnection.sheetName ? `gid=0&range=${initialConnection.sheetName}!${cellName}` : `gid=0&range=${cellName}`;
                      const url = `https://docs.google.com/spreadsheets/d/${initialConnection.sheetId}/edit#${sheet}`;
                      
                      // Open in new tab
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">View in Google Sheets</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Last updated: {new Date(initialConnection.lastUpdated || '').toLocaleString()}
        </p>
      </CardContent>
      
      <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
        <SheetsConnectionDialog
          boardId={boardId}
          initialConnection={initialConnection}
          onClose={() => setIsConnectDialogOpen(false)}
          onUpdate={onUpdate}
          testGoogleSheetsApi={testGoogleSheetsApi}
        />
      </Dialog>
    </Card>
  );
});