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
  // Function to test the Google Sheets API connection
  const testGoogleSheetsApi = async () => {
    try {
      // First verify that the API key is configured
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

  const onSubmit = async (values: ConnectionFormValues) => {
    try {
      console.log('Connecting to Google Sheets with form values:', values);
      
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
          console.log(`Validating sheet URL (attempt ${attempts + 1}/${maxAttempts}): ${values.sheetUrl}`);
          validationResult = await validateSheetUrl(values.sheetUrl);
          console.log('Validation successful:', validationResult);
          break; // Success - exit the loop
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Error validating sheet URL (attempt ${attempts + 1}/${maxAttempts}):`, errorMsg);
          
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
        console.error('Sheet validation failed:', validationResult);
        toast({
          title: "Invalid Google Sheet URL",
          description: validationResult?.message || "Please check the URL and try again.",
          variant: "destructive",
        });
        return;
      }
      
      // Normalize inputs - trim whitespace and ensure proper formatting
      const normalizedCellRange = values.cellRange.trim();
      let normalizedSheetName = values.sheetName?.trim() || undefined;
      
      // Special handling for problematic sheet name formats
      if (normalizedSheetName) {
        // Case 1: Sheet name is a numeric value (e.g., "1", "2", etc.)
        if (/^\d+$/.test(normalizedSheetName)) {
          const formattedSheetName = `Sheet${normalizedSheetName}`;
          console.log(`Converting numeric sheet name "${normalizedSheetName}" to "${formattedSheetName}" for API compatibility`);
          normalizedSheetName = formattedSheetName;
          
          toast({
            title: "Sheet Name Format Corrected",
            description: `Sheet name "${values.sheetName}" was automatically formatted as "${formattedSheetName}" for Google Sheets API compatibility.`,
          });
        }
        // Case 2: Sheet name has a space after "Sheet" (e.g., "Sheet 1")
        else if (normalizedSheetName.startsWith('Sheet ') && /Sheet\s+\d+/.test(normalizedSheetName)) {
          const formattedSheetName = normalizedSheetName.replace(/\s+/, '');
          console.log(`Converting sheet name with space "${normalizedSheetName}" to "${formattedSheetName}" for API compatibility`);
          normalizedSheetName = formattedSheetName;
          
          toast({
            title: "Sheet Name Format Corrected",
            description: `Sheet name "${values.sheetName}" was automatically formatted as "${formattedSheetName}" for Google Sheets API compatibility.`,
          });
        }
      }
      
      console.log('Normalized inputs:', {
        sheetId: validationResult.sheetId,
        cellRange: normalizedCellRange,
        sheetName: normalizedSheetName,
        label: values.label
      });
      
      // Create the connection object
      const connection = {
        sheetId: validationResult.sheetId,
        cellRange: normalizedCellRange,
        sheetName: normalizedSheetName,
        label: values.label || undefined,
        lastUpdated: new Date().toISOString(),
      };
      
      // Call the onUpdate callback to save the connection
      console.log('Updating connection with:', connection);
      onUpdate(connection);
      
      // Close the dialog
      setIsConnectDialogOpen(false);
      
      // Show success toast
      toast({
        title: "Connection saved",
        description: "The metric has been connected to Google Sheets. Loading data...",
      });
      
      // Invalidate the query to fetch the new data
      console.log('Invalidating query with key:', ['/api/google-sheets/cell', connection.sheetId, connection.cellRange, connection.sheetName]);
      queryClient.invalidateQueries({
        queryKey: ['/api/google-sheets/cell', connection.sheetId, connection.cellRange, connection.sheetName],
      });
      
      // Initiate an immediate refetch 
      setTimeout(() => {
        refetch();
      }, 500);
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
      } else if (errorMsg.toLowerCase().includes('parse range')) {
        toast({
          title: "Invalid Sheet Range",
          description: "The sheet name or cell reference format is invalid. Make sure to use the correct format (e.g., 'Sheet1' and 'A1').",
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
                  <div className="mt-4 flex flex-col space-y-3">
                    <div className="flex justify-between items-center w-full">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          testGoogleSheetsApi();
                        }}
                      >
                        Test API Key
                      </Button>
                      
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={async (e) => {
                          e.preventDefault();
                          if (!form.getValues("sheetUrl") || !form.getValues("cellRange")) {
                            toast({
                              title: "Missing information",
                              description: "Please provide a Sheet URL and cell reference to test",
                              variant: "destructive",
                            });
                            return;
                          }
                          
                          // Extract sheet ID from URL
                          try {
                            const sheetUrlValue = form.getValues("sheetUrl");
                            const validationResult = await validateSheetUrl(sheetUrlValue);
                            
                            if (!validationResult?.valid || !validationResult?.sheetId) {
                              toast({
                                title: "Invalid Sheet URL",
                                description: "Please enter a valid Google Sheets URL",
                                variant: "destructive",
                              });
                              return;
                            }
                            
                            // Perform connectivity test
                            toast({
                              title: "Testing connection",
                              description: "Attempting to connect to Google Sheets...",
                            });
                            
                            // Process the sheet name for testing
                            let sheetName = form.getValues("sheetName");
                            let originalSheetName = sheetName;
                            
                            // Check if we might have sheet name format issues
                            if (sheetName) {
                              // Handle numeric sheet names
                              if (/^\d+$/.test(sheetName)) {
                                // For testing, try both formats to diagnose issues
                                console.log(`Testing with numeric sheet name "${sheetName}". Also trying with "Sheet${sheetName}" format.`);
                                
                                toast({
                                  title: "Testing multiple formats",
                                  description: `Since your sheet name "${sheetName}" is a number, we'll also test with the format "Sheet${sheetName}" which is required by the Google Sheets API.`
                                });
                              }
                              // Handle sheet names with spaces between "Sheet" and number
                              else if (sheetName.startsWith('Sheet ') && /Sheet\s+\d+/.test(sheetName)) {
                                const fixedName = sheetName.replace(/\s+/, '');
                                console.log(`Testing with Sheet+space name "${sheetName}". Also trying with "${fixedName}" format.`);
                                
                                toast({
                                  title: "Testing multiple formats",
                                  description: `Since your sheet name "${sheetName}" has a space, we'll also test with the format "${fixedName}" which is required by the Google Sheets API.`
                                });
                              }
                            }
                            
                            // Create advanced test request
                            const response = await fetch('/api/google-sheets/connectivity-test', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({
                                sheetId: validationResult.sheetId,
                                sheetName: originalSheetName,  // Send original for better diagnostics
                                cellReference: form.getValues("cellRange")
                              })
                            });
                            
                            const result = await response.json();
                            
                            if (result.success) {
                              if (result.details?.cellTest?.success) {
                                toast({
                                  title: "Connection successful",
                                  description: `Successfully retrieved value: "${result.details.cellTest.value || 'empty cell'}"`,
                                });
                              } else if (result.details?.sheetExists) {
                                toast({
                                  title: "Partial success",
                                  description: `Sheet exists but couldn't access the specific cell. Available sheets: ${result.details.sheetNames?.join(", ")}`,
                                  variant: "destructive",
                                });
                              }
                            } else {
                              toast({
                                title: "Connection failed",
                                description: result.message || "Failed to connect to Google Sheets",
                                variant: "destructive",
                              });
                            }
                            
                          } catch (error) {
                            console.error('Error testing connectivity:', error);
                            toast({
                              title: "Connection test failed",
                              description: error instanceof Error ? error.message : "An unknown error occurred",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Test Connection
                      </Button>
                    </div>
                    
                    <Button type="submit" size="sm" className="w-full">
                      Connect
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }
  
  // Error state
  if (isError) {
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
  // Handle case where cellData might be null but not an error
  if (!cellData) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium flex items-center">
              <TableIcon className="h-3 w-3 mr-1" />
              {initialConnection?.label || 'Google Sheets Metric'}
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5 text-muted-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsConnectDialogOpen(true);
                    }}
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
            <div className="text-lg font-medium">
              No data available
            </div>
            {initialConnection?.label && (
              <div className="text-xs text-muted-foreground mt-1">
                {initialConnection.label}
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-2 px-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full text-xs mt-1"
                onClick={() => refetch()}
              >
                <RefreshCwIcon className="h-3 w-3 mr-1" />
                Reload data
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <div className="w-full flex justify-between items-center">
            <Badge variant="outline" className="text-xs font-normal">
              Connecting...
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
      </Card>
    );
  }

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
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Manually opening connection dialog');
                    setIsConnectDialogOpen(true);
                  }}
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
            {cellData.formattedValue || cellData.value || 'N/A'}
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
              <div className="mt-4 flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      testGoogleSheetsApi();
                    }}
                  >
                    Test API Key
                  </Button>
                  
                  <Button type="button" variant="outline" size="sm" onClick={handleDisconnect}>
                    Disconnect
                  </Button>
                </div>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                  onClick={async (e) => {
                    e.preventDefault();
                    if (!form.getValues("sheetUrl") || !form.getValues("cellRange")) {
                      toast({
                        title: "Missing information",
                        description: "Please provide a Sheet URL and cell reference to test",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    // Extract sheet ID from URL
                    try {
                      const sheetUrlValue = form.getValues("sheetUrl");
                      const validationResult = await validateSheetUrl(sheetUrlValue);
                      
                      if (!validationResult?.valid || !validationResult?.sheetId) {
                        toast({
                          title: "Invalid Sheet URL",
                          description: "Please enter a valid Google Sheets URL",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      // Perform connectivity test
                      toast({
                        title: "Testing connection",
                        description: "Attempting to connect to Google Sheets...",
                      });
                      
                      // Create advanced test request
                      const response = await fetch('/api/google-sheets/connectivity-test', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          sheetId: validationResult.sheetId,
                          sheetName: form.getValues("sheetName"),
                          cellReference: form.getValues("cellRange")
                        })
                      });
                      
                      const result = await response.json();
                      
                      if (result.success) {
                        if (result.details?.cellTest?.success) {
                          toast({
                            title: "Connection successful",
                            description: `Successfully retrieved value: "${result.details.cellTest.value || 'empty cell'}"`,
                          });
                        } else if (result.details?.sheetExists) {
                          toast({
                            title: "Partial success",
                            description: `Sheet exists but couldn't access the specific cell. Available sheets: ${result.details.sheetNames?.join(", ")}`,
                            variant: "destructive",
                          });
                        }
                      } else {
                        toast({
                          title: "Connection failed",
                          description: result.message || "Failed to connect to Google Sheets",
                          variant: "destructive",
                        });
                      }
                      
                    } catch (error) {
                      console.error('Error testing connectivity:', error);
                      toast({
                        title: "Connection test failed",
                        description: error instanceof Error ? error.message : "An unknown error occurred",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Test Connection
                </Button>
                
                <Button type="submit" size="sm" className="w-full">
                  Update Connection
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
});