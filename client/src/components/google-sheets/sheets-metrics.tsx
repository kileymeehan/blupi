import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { TableIcon, ExternalLinkIcon, LinkIcon, RefreshCwIcon, AlertCircleIcon } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { fetchSheetCell, validateSheetUrl } from '../../services/google-sheets-api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

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
  };
  onUpdate: (connection: {
    sheetId: string;
    sheetName?: string;
    cellRange: string;
    label?: string;
    lastUpdated: string;
  }) => void;
}

const connectionFormSchema = z.object({
  sheetUrl: z.string().url('Please enter a valid Google Sheets URL'),
  cellRange: z.string().min(1, 'Cell reference is required (e.g., A1)'),
  sheetName: z.string().optional(),
  label: z.string().optional(),
});

type ConnectionFormValues = z.infer<typeof connectionFormSchema>;

// Create a handle type for the component
// Define the interface for the ref handle that will be exposed to parent components
export interface SheetsMetricsHandle {
  openConnectDialog: () => void;
}

export const SheetsMetrics = forwardRef<SheetsMetricsHandle, SheetsMetricsProps>(({ 
  blockId, 
  boardId, 
  className = '', 
  initialConnection,
  onUpdate
}: SheetsMetricsProps, ref) => {
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    openConnectDialog: () => setIsConnectDialogOpen(true)
  }));
  
  // Create form with default values
  const form = useForm<ConnectionFormValues>({
    resolver: zodResolver(connectionFormSchema),
    defaultValues: {
      sheetUrl: '',
      cellRange: '',
      sheetName: '',
      label: '',
    },
  });

  // Set form values when initialConnection changes
  useEffect(() => {
    if (initialConnection) {
      form.setValue('cellRange', initialConnection.cellRange);
      form.setValue('sheetName', initialConnection.sheetName || '');
      form.setValue('label', initialConnection.label || '');
      // Note: We don't have the URL in the connection, only the ID
    }
  }, [initialConnection, form]);

  // Fetch cell data if we have a connection
  const { 
    data: cellData, 
    isLoading, 
    isError,
    error,
    refetch
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
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Handle form submission
  const onSubmit = async (values: ConnectionFormValues) => {
    try {
      // First validate the Google Sheet URL with retry logic
      let validationResult;
      let attempts = 0;
      const maxAttempts = 3;
      
      // Start processing indicator
      toast({
        title: "Processing",
        description: "Validating Google Sheet connection...",
      });
      
      while (attempts < maxAttempts) {
        try {
          validationResult = await validateSheetUrl(values.sheetUrl);
          break; // Success - exit the loop
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          
          // Check if this is a rate limit error
          if (errorMsg.toLowerCase().includes('rate limit') || 
              errorMsg.toLowerCase().includes('quota') ||
              errorMsg.toLowerCase().includes('too many requests')) {
            
            attempts++;
            
            // If we've tried the maximum number of times, throw the error
            if (attempts >= maxAttempts) {
              throw error;
            }
            
            // Otherwise wait and try again
            toast({
              title: "Rate limit encountered",
              description: `Waiting before retrying (attempt ${attempts}/${maxAttempts})...`,
            });
            
            // Wait longer between each retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
            continue;
          }
          
          // For non-rate-limit errors, just throw it right away
          throw error;
        }
      }
      
      if (!validationResult?.valid || !validationResult?.sheetId) {
        toast({
          title: "Invalid Google Sheet URL",
          description: validationResult?.message || "Please check the URL and try again.",
          variant: "destructive",
        });
        return;
      }
      
      // Create the connection object
      const connection = {
        sheetId: validationResult.sheetId,
        cellRange: values.cellRange,
        sheetName: values.sheetName || undefined,
        label: values.label || undefined,
        lastUpdated: new Date().toISOString(),
      };
      
      // Call the onUpdate callback
      onUpdate(connection);
      
      // Close the dialog
      setIsConnectDialogOpen(false);
      
      // Show success toast
      toast({
        title: "Connection successful",
        description: "The metric is now connected to Google Sheets data.",
      });
      
      // Invalidate the query to fetch the new data
      queryClient.invalidateQueries({
        queryKey: ['/api/google-sheets/cell', connection.sheetId, connection.cellRange, connection.sheetName],
      });
    } catch (error) {
      console.error('Error connecting to Google Sheet:', error);
      const errorMsg = error instanceof Error ? error.message : "An unknown error occurred.";
      
      // Check if it's a rate limiting error
      if (errorMsg.toLowerCase().includes('rate limit') || 
          errorMsg.toLowerCase().includes('quota') ||
          errorMsg.toLowerCase().includes('too many requests')) {
        toast({
          title: "API Rate Limit Reached",
          description: "Google Sheets API rate limit has been reached. Please wait a few minutes before trying again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Connection failed",
          description: errorMsg,
          variant: "destructive",
        });
      }
    }
  };

  // Handle disconnecting the sheet
  const handleDisconnect = () => {
    onUpdate({
      sheetId: '',
      cellRange: '',
      lastUpdated: new Date().toISOString(),
    });
    
    toast({
      title: "Connection removed",
      description: "The metric is no longer connected to Google Sheets data.",
    });
    
    setIsConnectDialogOpen(false);
  };

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
                onClick={() => setIsConnectDialogOpen(true)}
              >
                <LinkIcon className="h-3 w-3 mr-2" />
                Connect to Google Sheets
              </Button>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Connect to Google Sheets</DialogTitle>
                <DialogDescription>
                  Enter the details to connect this metric to a Google Sheets cell.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
                  <FormField
                    control={form.control}
                    name="sheetUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Google Sheet URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://docs.google.com/spreadsheets/d/..." {...field} />
                        </FormControl>
                        <FormDescription>
                          Paste the URL of your Google Sheet
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sheetName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sheet Name (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Sheet1" {...field} />
                        </FormControl>
                        <FormDescription>
                          Leave blank to use the first sheet
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cellRange"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cell Reference</FormLabel>
                        <FormControl>
                          <Input placeholder="A1" {...field} />
                        </FormControl>
                        <FormDescription>
                          E.g., A1 or B2:C3 for a range
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Label (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Conversion Rate" {...field} />
                        </FormControl>
                        <FormDescription>
                          A label for this metric
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="mt-4">
                    <Button type="submit" size="sm">
                      Connect
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }
  
  // Error state
  if (isError || !cellData) {
    // Check if the error is related to rate limiting
    const errorMessage = error instanceof Error ? error.message : 'Failed to load data from Google Sheets.';
    const isRateLimitError = 
      errorMessage.toLowerCase().includes('rate limit') || 
      errorMessage.toLowerCase().includes('quota') ||
      errorMessage.toLowerCase().includes('too many requests');
      
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center">
            <TableIcon className="h-3 w-3 mr-1" />
            Google Sheets Metric
          </CardTitle>
          <CardDescription className="text-xs">
            {isRateLimitError ? 'API Rate Limit Reached' : 'Error loading data'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex items-start mb-2 text-destructive">
            <AlertCircleIcon className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" />
            <div>
              {isRateLimitError ? (
                <p className="text-sm">
                  Google Sheets API rate limit reached. Please wait a few minutes before trying again.
                </p>
              ) : (
                <p className="text-sm">{errorMessage}</p>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={() => refetch()}
              disabled={isRateLimitError}
            >
              <RefreshCwIcon className="h-3 w-3 mr-1" />
              {isRateLimitError ? 'Please wait...' : 'Retry'}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={() => setIsConnectDialogOpen(true)}
            >
              <LinkIcon className="h-3 w-3 mr-1" />
              Reconnect
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success state with data
  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium flex items-center">
            <TableIcon className="h-3 w-3 mr-1" />
            {initialConnection.label || 'Google Sheets Metric'}
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5 text-muted-foreground"
                  onClick={() => setIsConnectDialogOpen(true)}
                >
                  <LinkIcon className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Change connection settings</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="text-center py-1">
          <div className="text-2xl font-bold">
            {cellData.formattedValue || 'N/A'}
          </div>
          {initialConnection.label && (
            <div className="text-xs text-muted-foreground mt-1">
              {initialConnection.label}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <div className="w-full flex justify-between items-center">
          <Badge variant="outline" className="text-xs font-normal">
            {new Date(cellData.timestamp).toLocaleString(undefined, { 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit', 
              minute: '2-digit'
            })}
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 p-0"
            onClick={() => refetch()}
          >
            <RefreshCwIcon className="h-3 w-3 mr-1" />
            <span className="text-xs">Refresh</span>
          </Button>
        </div>
      </CardFooter>
      
      {/* Connection Dialog */}
      <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Google Sheets Connection</DialogTitle>
            <DialogDescription>
              Manage the connection to Google Sheets for this metric.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <FormField
                control={form.control}
                name="sheetUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google Sheet URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://docs.google.com/spreadsheets/d/..." {...field} />
                    </FormControl>
                    <FormDescription>
                      Paste the URL of your Google Sheet
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sheetName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sheet Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Sheet1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Leave blank to use the first sheet
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cellRange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cell Reference</FormLabel>
                    <FormControl>
                      <Input placeholder="A1" {...field} />
                    </FormControl>
                    <FormDescription>
                      E.g., A1 or B2:C3 for a range
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Conversion Rate" {...field} />
                    </FormControl>
                    <FormDescription>
                      A label for this metric
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="mt-4 space-x-2">
                <Button type="button" variant="outline" size="sm" onClick={handleDisconnect}>
                  Disconnect
                </Button>
                <Button type="submit" size="sm">
                  Update Connection
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
});