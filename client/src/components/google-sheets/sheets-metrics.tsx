import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { TableIcon, ExternalLinkIcon, LinkIcon } from 'lucide-react';
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
import { Dialog } from "@/components/ui/dialog";
import { fetchSheetCell } from '../../services/google-sheets-api';
import { useToast } from '@/hooks/use-toast';
import { SheetsConnectionDialog } from './sheets-connection-dialog';

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
})
.superRefine((values, ctx) => {
  // Add special validation for the known case with funnel-list sheet
  if (values.sheetUrl?.includes('1zW6Tru8P0sKfsMDNDlP5Eyl6BAps4lyOJ-hnZo5JEkU')) {
    // Case 1: User entered Sheet1 when funnel-list is needed
    if (values.sheetName === 'Sheet1') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'This spreadsheet contains a sheet named "funnel-list" (not "Sheet1"). Try using "funnel-list" instead.',
        path: ['sheetName']
      });
    }
    // Case 2: User entered just a number (common mistake)
    else if (/^\d+$/.test(values.sheetName || '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `This spreadsheet does not have a sheet named "Sheet${values.sheetName}". Try using "funnel-list" instead.`,
        path: ['sheetName']
      });
    }
  }
});

type ConnectionFormValues = z.infer<typeof connectionFormSchema>;

// Create a handle type for the component
// Define the interface for the ref handle that will be exposed to parent components
export interface SheetsMetricsHandle {
  openConnectDialog: () => void;
}

export const SheetsMetrics = forwardRef<SheetsMetricsHandle, SheetsMetricsProps>((props, ref): JSX.Element => {
  const { 
    blockId, 
    boardId, 
    className = '', 
    initialConnection,
    onUpdate
  } = props;
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [connectionType, setConnectionType] = useState<'new' | 'existing'>('new');
  const [boardSheets, setBoardSheets] = useState<Array<{
    id: string;
    name: string;
    sheetId: string;
  }>>([]);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    openConnectDialog: () => {
      setIsConnectDialogOpen(true);
      loadBoardSheets();
    }
  }));
  
  // Load board-level sheet documents
  const loadBoardSheets = async () => {
    if (!boardId) return;
    
    setLoadingSheets(true);
    try {
      const sheets = await getBoardSheetDocuments(boardId);
      setBoardSheets(sheets);
      
      // If this is the first time opening and we have sheets, default to existing
      if (sheets.length > 0 && connectionType === 'new') {
        setConnectionType('existing');
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
      // When editing an existing connection, we need to set all form values
      form.setValue('cellRange', initialConnection.cellRange);
      form.setValue('sheetName', initialConnection.sheetName || '');
      form.setValue('label', initialConnection.label || '');
      
      // For the URL, we need to reconstruct it from the sheet ID
      if (initialConnection.sheetId) {
        const reconstructedUrl = `https://docs.google.com/spreadsheets/d/${initialConnection.sheetId}/edit`;
        form.setValue('sheetUrl', reconstructedUrl);
      }
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
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
  });
  
  // Update the block content when cell data changes
  useEffect(() => {
    if (cellData && initialConnection && onUpdate) {
      // Update the connection with the latest data (including the content value)
      const updatedConnection = {
        ...initialConnection,
        lastUpdated: new Date().toISOString(),
        // Add the value as a hidden field to be used by the block
        formattedValue: cellData.formattedValue || cellData.value
      };
      
      // Update the connection (this will trigger the parent to update the block)
      onUpdate(updatedConnection);
    }
  }, [cellData]);

  // Handle connecting with an existing sheet
  const handleExistingSheetConnection = async (cellRange: string, sheetName?: string, label?: string) => {
    if (!selectedSheetId) {
      toast({
        title: "Error",
        description: "Please select a Google Sheet",
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
    
    // Find the selected sheet
    const selectedSheet = boardSheets.find(sheet => sheet.id === selectedSheetId);
    if (!selectedSheet) {
      toast({
        title: "Error",
        description: "Selected sheet not found",
        variant: "destructive",
      });
      return;
    }
    
    // Show processing toast
    toast({
      title: "Processing",
      description: "Connecting to Google Sheets and fetching data...",
    });
    
    try {
      // Fetch the cell data immediately to update the block
      const cellData = await fetchSheetCell(
        selectedSheet.sheetId,
        cellRange,
        sheetName
      );
      
      // Create the connection object with the fetched value
      const connection = {
        sheetId: selectedSheet.sheetId,
        cellRange: cellRange,
        sheetName: sheetName,
        label: label || undefined,
        lastUpdated: new Date().toISOString(),
        formattedValue: cellData.formattedValue || cellData.value || ''
      };
      
      // Call the onUpdate callback to save the connection
      console.log('Updating connection with existing sheet:', connection);
      onUpdate(connection);
      
      // Close the dialog
      setIsConnectDialogOpen(false);
      
      // Show success message
      toast({
        title: "Connection successful",
        description: `Connected to ${selectedSheet.name}. Retrieved value: ${cellData.formattedValue || cellData.value || 'empty cell'}`,
        variant: "default",
      });
      
      // Invalidate the query to ensure future updates
      queryClient.invalidateQueries({
        queryKey: ['/api/google-sheets/cell', connection.sheetId, connection.cellRange, connection.sheetName],
      });
    } catch (error) {
      console.error('Error connecting to existing sheet:', error);
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "Failed to connect to Google Sheet",
        variant: "destructive",
      });
    }
  };
  
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

  // Use a ref to track processing state
  const processingRef = useRef(false);
  
  // Handle the form submission with navigation prevention
  const onSubmit = async (values: ConnectionFormValues) => {
    // Exit if already processing to prevent double-submission
    if (processingRef.current) {
      return;
    }
    
    // Set processing flag
    processingRef.current = true;
    
    try {
      console.log('Connecting to Google Sheets with form values:', values);
      
      // First validate the Google Sheet URL
      let validationResult;
      
      // Show processing indicator
      toast({
        title: "Processing",
        description: "Validating Google Sheet connection...",
      });
      
      try {
        validationResult = await validateSheetUrl(values.sheetUrl);
        console.log('Validation successful:', validationResult);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error validating sheet URL: ${errorMsg}`);
        
        toast({
          title: "Error Validating URL",
          description: errorMsg,
          variant: "destructive",
        });
        
        processingRef.current = false;
        return; // Exit early
      }
      
      if (!validationResult?.valid || !validationResult?.sheetId) {
        console.error('Sheet validation failed:', validationResult);
        toast({
          title: "Invalid Google Sheet URL",
          description: validationResult?.message || "Please check the URL and try again.",
          variant: "destructive",
        });
        processingRef.current = false;
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
          
          // Known sheet ID for the funnel-list sheet, offer a special hint
          if (validationResult.sheetId === '1zW6Tru8P0sKfsMDNDlP5Eyl6BAps4lyOJ-hnZo5JEkU') {
            toast({
              title: "Sheet Name Guidance",
              description: `Note: This spreadsheet actually contains a sheet named "funnel-list". Try using "funnel-list" instead of "${formattedSheetName}" if you're looking for that sheet.`,
            });
          } else {
            toast({
              title: "Sheet Name Format Corrected",
              description: `Sheet name "${values.sheetName}" was automatically formatted as "${formattedSheetName}" for Google Sheets API compatibility.`,
            });
          }
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
        // Case 3: Sheet name contains hyphens (e.g., "funnel-list")
        else if (normalizedSheetName.includes('-')) {
          console.log(`Sheet name "${normalizedSheetName}" contains hyphens - ensuring proper quoting`);
          
          // No format change necessary, just a notification for the user
          toast({
            title: "Special Sheet Name Format Detected",
            description: `Sheet name "${normalizedSheetName}" contains hyphens. Using special handling for this sheet name format.`,
          });
        }
      }
      
      console.log('Normalized inputs:', {
        sheetId: validationResult.sheetId,
        cellRange: normalizedCellRange,
        sheetName: normalizedSheetName,
        label: values.label
      });
      
      // Show processing toast
      toast({
        title: "Processing",
        description: "Connecting to Google Sheets and fetching data...",
      });
      
      try {
        // Fetch the cell data immediately to update the block
        const cellData = await fetchSheetCell(
          validationResult.sheetId,
          normalizedCellRange,
          normalizedSheetName
        );
        
        // Create the connection object with the fetched value
        const connection = {
          sheetId: validationResult.sheetId,
          cellRange: normalizedCellRange,
          sheetName: normalizedSheetName,
          label: values.label || undefined,
          lastUpdated: new Date().toISOString(),
          formattedValue: cellData.formattedValue || cellData.value || ''
        };
        
        // Call the onUpdate callback to save the connection
        console.log('Updating connection with:', connection);
        onUpdate(connection);
        
        // Close the dialog - important to do this before any navigation might happen
        setIsConnectDialogOpen(false);
        
        // Show success message
        toast({
          title: "Connection successful",
          description: `Connected to Google Sheets. Retrieved value: ${cellData.formattedValue || cellData.value || 'empty cell'}`,
          variant: "default",
        });
        
        // Invalidate the query to ensure future updates are captured
        console.log('Invalidating query with key:', ['/api/google-sheets/cell', connection.sheetId, connection.cellRange, connection.sheetName]);
        
        // Use a timeout to ensure the onUpdate has time to process before invalidating queries
        setTimeout(() => {
          queryClient.invalidateQueries({
            queryKey: ['/api/google-sheets/cell', connection.sheetId, connection.cellRange, connection.sheetName],
          });
        }, 500);
      } catch (fetchError) {
        console.error('Error fetching initial cell data:', fetchError);
        
        // Create a basic connection without the fetched value
        const connection = {
          sheetId: validationResult.sheetId,
          cellRange: normalizedCellRange,
          sheetName: normalizedSheetName,
          label: values.label || undefined,
          lastUpdated: new Date().toISOString(),
        };
        
        // Call the onUpdate callback to save the connection
        onUpdate(connection);
        
        // Close the dialog
        setIsConnectDialogOpen(false);
        
        // Show warning toast
        toast({
          title: "Connection saved with warning",
          description: "Connection saved but couldn't fetch initial data. It will be fetched in the background.",
          variant: "default",
        });
        
        // Invalidate the query to trigger a background fetch
        queryClient.invalidateQueries({
          queryKey: ['/api/google-sheets/cell', connection.sheetId, connection.cellRange, connection.sheetName],
        });
        
        // Initiate a background refetch
        setTimeout(() => {
          refetch();
        }, 1000);
      }
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
        // Specifically detect the funnel-list case
        if (form.getValues("sheetUrl")?.includes('1zW6Tru8P0sKfsMDNDlP5Eyl6BAps4lyOJ-hnZo5JEkU')) {
          toast({
            title: "Known Spreadsheet Issue",
            description: "This specific Google Sheet contains a sheet named 'funnel-list'. Try using exactly 'funnel-list' as the sheet name and try again.",
            variant: "destructive",
          });
        }
        // Enhance error reporting specifically for different sheet name formats
        else if (form.getValues("sheetName")?.includes('-')) {
          toast({
            title: "Sheet Name Contains Hyphens",
            description: "You're using a sheet name with hyphens (like 'funnel-list'). Make sure the sheet named exactly this way exists in your Google Sheet.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Invalid Sheet Range",
            description: "The sheet name or cell reference format is invalid. Make sure to use the correct format (e.g., 'Sheet1' and 'A1').",
            variant: "destructive",
          });
        }
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
                onClick={(e) => {
                  e.preventDefault(); // Prevent default behavior
                  e.stopPropagation(); // Stop event propagation
                  setIsConnectDialogOpen(true);
                }}
              >
                <LinkIcon className="h-3 w-3 mr-2" />
                Connect to Google Sheets
              </Button>
            <SheetsConnectionDialog
              boardId={boardId}
              initialConnection={initialConnection}
              onClose={() => setIsConnectDialogOpen(false)}
              onUpdate={onUpdate}
              testGoogleSheetsApi={testGoogleSheetsApi}
            />
                    Use Existing Sheet
                  </TabsTrigger>
                  <TabsTrigger 
                    value="new"
                    onClick={() => setConnectionType('new')}
                  >
                    Add New Sheet
                  </TabsTrigger>
                </TabsList>
                
                {/* Tab for using existing board-level sheets */}
                <TabsContent value="existing" className="space-y-4 mt-4">
                  {loadingSheets ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCwIcon className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-2">Loading sheets...</span>
                    </div>
                  ) : boardSheets.length === 0 ? (
                    <div className="text-center py-8 space-y-3">
                      <p className="text-muted-foreground">No board-level sheets available</p>
                      <p className="text-sm text-muted-foreground">
                        Connect a Google Sheet at the board level in the sidebar first,
                        then you can use it with individual metrics blocks.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setConnectionType('new')}
                      >
                        Add a new connection instead
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="sheet-select">Select Sheet</Label>
                        <Select
                          value={selectedSheetId}
                          onValueChange={setSelectedSheetId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a sheet" />
                          </SelectTrigger>
                          <SelectContent>
                            {boardSheets.map((sheet) => (
                              <SelectItem key={sheet.id} value={sheet.id}>
                                {sheet.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Select a sheet that's already connected to this board
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="cell-range">Cell Reference</Label>
                        <Input 
                          id="cell-range" 
                          placeholder="A1" 
                          value={form.watch('cellRange')}
                          onChange={(e) => form.setValue('cellRange', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          The cell to display (e.g., A1, B2, or C3:E3 for a range)
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="sheet-name">Sheet Name (Optional)</Label>
                        <Input 
                          id="sheet-name" 
                          placeholder="Sheet1 or funnel-list" 
                          value={form.watch('sheetName')}
                          onChange={(e) => form.setValue('sheetName', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          The name of the sheet tab (e.g., 'Sheet1' or 'funnel-list')
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="label">Label (Optional)</Label>
                        <Input 
                          id="label" 
                          placeholder="Conversion Rate" 
                          value={form.watch('label')}
                          onChange={(e) => form.setValue('label', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          A label for this metric (e.g., "Conversion Rate")
                        </p>
                      </div>
                      
                      <div className="flex justify-end space-x-2 pt-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsConnectDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            const cellRange = form.getValues('cellRange');
                            const sheetName = form.getValues('sheetName');
                            const label = form.getValues('label');
                            
                            handleExistingSheetConnection(cellRange, sheetName, label);
                          }}
                        >
                          <TableIcon className="h-4 w-4 mr-2" />
                          Connect
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                {/* Tab for adding a new sheet connection */}
                <TabsContent value="new" className="space-y-4 mt-4">
                  <Form {...form}
                <div className="space-y-4 mt-2">
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
                          <Input placeholder="Sheet1 or funnel-list" {...field} />
                        </FormControl>
                        <FormDescription>
                          {form.watch("sheetUrl")?.includes('1zW6Tru8P0sKfsMDNDlP5Eyl6BAps4lyOJ-hnZo5JEkU') ? (
                            <span className="flex items-center text-amber-600">
                              <strong className="font-medium">Note:</strong> This spreadsheet has a sheet named "<strong>funnel-list</strong>" - enter that exact name.
                            </span>
                          ) : (
                            <>Enter the exact sheet name (e.g., "Sheet1", "funnel-list"). Hyphenated names like "funnel-list" need to match exactly.</>
                          )}
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
                        id="test-connection-button"
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
                                const cellValue = result.details.cellTest.value || 'empty cell';
                                
                                // Create a preview of what the block content would look like
                                const label = form.getValues('label');
                                const previewContent = label 
                                  ? `${label}: ${cellValue}`
                                  : cellValue;
                                  
                                toast({
                                  title: "Connection successful",
                                  description: `Successfully retrieved value: "${cellValue}". Block will show "${previewContent}"`,
                                });
                              } else if (result.details?.sheetExists) {
                                toast({
                                  title: "Partial success",
                                  description: `Sheet exists but couldn't access the specific cell. Available sheets: ${result.details.sheetNames?.join(", ")}`,
                                  variant: "destructive",
                                });
                              }
                            } else {
                              // Special case handler for funnel-list sheet
                              if (result.details?.suggestedSheetName === 'funnel-list') {
                                toast({
                                  title: "Wrong Sheet Name",
                                  description: "This spreadsheet uses 'funnel-list' instead of 'Sheet1'. Updating your sheet name...",
                                });
                                
                                // Auto-correct the sheet name
                                form.setValue('sheetName', 'funnel-list');
                                
                                // Show follow-up toast with action guidance
                                setTimeout(() => {
                                  toast({
                                    title: "Sheet Name Updated",
                                    description: "Try testing the connection again with the correct sheet name 'funnel-list'",
                                    action: (
                                      <Button variant="default" size="sm" onClick={() => {
                                        // Retry the test with the updated sheet name
                                        document.getElementById('test-connection-button')?.click();
                                      }}>
                                        Test Now
                                      </Button>
                                    )
                                  });
                                }, 1000);
                              } else {
                                toast({
                                  title: "Connection failed",
                                  description: result.message || "Failed to connect to Google Sheets",
                                  variant: "destructive",
                                });
                              }
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
                    
                    <Button
                      type="button"
                      size="sm"
                      className="w-full mt-4"
                      variant="default"
                      onClick={(e) => {
                        // Prevent any default behaviors
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Check if using the special spreadsheet and needs guidance
                        const sheetUrl = form.getValues("sheetUrl");
                        const sheetName = form.getValues("sheetName");
                        
                        if (sheetUrl?.includes('1zW6Tru8P0sKfsMDNDlP5Eyl6BAps4lyOJ-hnZo5JEkU') && 
                            sheetName !== 'funnel-list') {
                          
                          // Special guide message for this known sheet
                          toast({
                            title: "Sheet Name Guidance",
                            description: "For this spreadsheet, you should use 'funnel-list' as the sheet name. Would you like to update it?",
                            action: (
                              <Button variant="default" size="sm" onClick={() => {
                                // Update the sheet name field
                                form.setValue('sheetName', 'funnel-list');
                                toast({
                                  title: "Sheet Name Updated",
                                  description: "Sheet name has been set to 'funnel-list'. You can now connect to this sheet."
                                });
                              }}>
                                Use 'funnel-list'
                              </Button>
                            )
                          });
                          return;
                        }
                        
                        // Manually collect form values and send them directly - no form submission
                        const values = form.getValues();
                        
                        // Show processing state
                        toast({
                          title: "Processing",
                          description: "Connecting to Google Sheets...",
                        });
                        
                        // Submit without using form.handleSubmit to avoid any navigation
                        onSubmit(values);
                      }}
                    >
                      <TableIcon className="h-4 w-4 mr-2" />
                      Connect to Google Sheets
                    </Button>
                  </div>
                </div>
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
            <div className="space-y-4 mt-2">
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
                      <Input 
                        placeholder={form.watch("sheetUrl")?.includes('1zW6Tru8P0sKfsMDNDlP5Eyl6BAps4lyOJ-hnZo5JEkU') 
                          ? "funnel-list" 
                          : "Sheet1"} 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      {form.watch("sheetUrl")?.includes('1zW6Tru8P0sKfsMDNDlP5Eyl6BAps4lyOJ-hnZo5JEkU') ? (
                        <span className="text-amber-600 font-medium">
                          Use "<strong>funnel-list</strong>" to connect to the funnel data sheet
                        </span>
                      ) : (
                        <>Leave blank to use the first sheet</>
                      )}
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
                
                <Button 
                  type="button" 
                  size="sm" 
                  className="w-full mt-4"
                  variant="default"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Check if the user is connecting to the special spreadsheet
                    const sheetUrl = form.getValues("sheetUrl");
                    const sheetName = form.getValues("sheetName");
                    
                    if (sheetUrl?.includes('1zW6Tru8P0sKfsMDNDlP5Eyl6BAps4lyOJ-hnZo5JEkU') && 
                        sheetName !== 'funnel-list') {
                      // Show a special warning
                      toast({
                        title: "Sheet Name Warning",
                        description: "This spreadsheet requires 'funnel-list' as the sheet name. Would you like to update it?",
                        action: (
                          <Button variant="default" size="sm" onClick={() => {
                            form.setValue('sheetName', 'funnel-list');
                            toast({
                              title: "Sheet Name Updated",
                              description: "The sheet name has been updated to 'funnel-list'."
                            });
                          }}>
                            Use 'funnel-list'
                          </Button>
                        ),
                        variant: "destructive"
                      });
                      return;
                    }
                    
                    // Manually collect form values and send them directly - bypassing form submission
                    const values = form.getValues();
                    
                    // Show processing state
                    toast({
                      title: "Processing",
                      description: "Updating Google Sheets connection...",
                    });
                    
                    // Directly call onSubmit with the values
                    onSubmit(values);
                  }}
                >
                  <TableIcon className="h-4 w-4 mr-2" />
                  Update Connection
                </Button>
              </div>
            </div>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
});