import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TableIcon, RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  validateSheetUrl, 
  fetchSheetCell,
  getBoardSheetDocuments 
} from '../../services/google-sheets-api';

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

interface SheetsConnectionDialogProps {
  boardId: number;
  initialConnection?: {
    sheetId: string;
    sheetName?: string;
    cellRange: string;
    label?: string;
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

interface BoardSheet {
  id: string;
  name: string;
  sheetId: string;
  boardId: number;
  createdAt: string;
  updatedAt: string;
}

export function SheetsConnectionDialog({
  boardId,
  initialConnection,
  onClose,
  onUpdate,
  testGoogleSheetsApi
}: SheetsConnectionDialogProps) {
  const [connectionType, setConnectionType] = useState<'new' | 'existing'>('new');
  const [boardSheets, setBoardSheets] = useState<BoardSheet[]>([]);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');
  const [existingCellRange, setExistingCellRange] = useState('');
  const [existingSheetName, setExistingSheetName] = useState('');
  const [existingLabel, setExistingLabel] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Create form with default values
  const form = useForm<ConnectionFormValues>({
    resolver: zodResolver(connectionFormSchema),
    defaultValues: {
      sheetUrl: initialConnection?.sheetId ? `https://docs.google.com/spreadsheets/d/${initialConnection.sheetId}/edit` : '',
      cellRange: initialConnection?.cellRange || '',
      sheetName: initialConnection?.sheetName || '',
      label: initialConnection?.label || '',
    },
  });
  
  // Load board sheets when component mounts
  useEffect(() => {
    loadBoardSheets();
  }, [boardId]);
  
  // Set initial form values for existing connection
  useEffect(() => {
    if (initialConnection) {
      setExistingCellRange(initialConnection.cellRange);
      setExistingSheetName(initialConnection.sheetName || '');
      setExistingLabel(initialConnection.label || '');
    }
  }, [initialConnection]);
  
  // Load board-level sheet documents
  const loadBoardSheets = async () => {
    if (!boardId) return;
    
    setLoadingSheets(true);
    try {
      const sheets = await getBoardSheetDocuments(boardId);
      setBoardSheets(sheets);
      
      // If we have sheets, default to using existing sheets
      if (sheets.length > 0) {
        setConnectionType('existing');
        // Default to selecting the first sheet if we have sheets and none is selected
        if (!selectedSheetId && sheets.length > 0) {
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
  
  // Handle connecting with an existing sheet
  const handleExistingSheetConnection = async () => {
    if (!selectedSheetId) {
      toast({
        title: "Error",
        description: "Please select a Google Sheet",
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
        existingCellRange,
        existingSheetName
      );
      
      // Create the connection object with the fetched value
      const connection = {
        sheetId: selectedSheet.sheetId,
        cellRange: existingCellRange,
        sheetName: existingSheetName || undefined,
        label: existingLabel || undefined,
        lastUpdated: new Date().toISOString(),
        formattedValue: cellData.formattedValue || cellData.value || ''
      };
      
      // Call the onUpdate callback to save the connection
      console.log('Updating connection with existing sheet:', connection);
      onUpdate(connection);
      
      // Close the dialog
      onClose();
      
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
  
  // Handle new sheet connection form submission
  const onSubmit = async (values: ConnectionFormValues) => {
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
        
        return; // Exit early
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
      
      // Normalize inputs
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
      }
      
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
        
        // Close the dialog
        onClose();
        
        // Show success message
        toast({
          title: "Connection successful",
          description: `Connected to Google Sheets. Retrieved value: ${cellData.formattedValue || cellData.value || 'empty cell'}`,
          variant: "default",
        });
        
        // Invalidate the query to ensure future updates
        queryClient.invalidateQueries({
          queryKey: ['/api/google-sheets/cell', connection.sheetId, connection.cellRange, connection.sheetName],
        });
      } catch (error) {
        console.error('Error fetching cell data:', error);
        
        toast({
          title: "Connection Error",
          description: error instanceof Error ? error.message : "Failed to fetch cell data",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error connecting to Google Sheet:', error);
      const errorMsg = error instanceof Error ? error.message : "An unknown error occurred.";
      
      toast({
        title: "Connection Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };
  
  // Function to test connection
  const testConnection = async () => {
    try {
      const isValid = await form.trigger(['sheetUrl', 'cellRange']);
      if (!isValid) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid Google Sheet URL and cell reference.",
          variant: "destructive",
        });
        return;
      }
      
      const sheetUrl = form.getValues("sheetUrl");
      const cellReference = form.getValues("cellRange");
      const sheetName = form.getValues("sheetName");
      
      const validationResult = await validateSheetUrl(sheetUrl);
      
      if (!validationResult.valid) {
        toast({
          title: "Invalid URL",
          description: validationResult.message || "The Google Sheet URL is not valid.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Testing Connection",
        description: "Testing connection to Google Sheets...",
      });
      
      let originalSheetName = sheetName;
      
      // Handle common issues with sheet names
      let testSheetName = sheetName;
      if (sheetName && sheetName.trim() !== '') {
        // Case 1: Just a digit (e.g., "1")
        if (/^\d+$/.test(sheetName)) {
          const fixedName = `Sheet${sheetName}`;
          console.log(`[Format Fix] Converting numeric sheet name "${sheetName}" to "${fixedName}"`);
          testSheetName = fixedName;
          
          // Keep the original for diagnostics
          originalSheetName = sheetName;
        }
        // Case 2: Sheet with space (e.g., "Sheet 1") 
        else if (sheetName.startsWith('Sheet ') && /Sheet\s+\d+/.test(sheetName)) {
          const fixedName = sheetName.replace(/\s+/, '');
          console.log(`[Format Fix] Converting sheet name with space "${sheetName}" to "${fixedName}"`);
          testSheetName = fixedName;
          
          // Keep the original for diagnostics
          originalSheetName = sheetName;
            
          toast({
            title: "Testing multiple formats",
            description: `Since your sheet name has a space, we'll also test with the format "${fixedName}" which is required by the Google Sheets API.`
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
          cellReference
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
                <Button variant="default" size="sm" onClick={() => testConnection()}>
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
      const errorMsg = error instanceof Error ? error.message : "An unknown error occurred";
      
      toast({
        title: "Connection error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };
  
  // Pick the right view to show
  const showExistingView = connectionType === 'existing' && boardSheets.length > 0;
  const showNewView = connectionType === 'new' || boardSheets.length === 0;
  
  return (
    <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Connect to Google Sheets</DialogTitle>
        <DialogDescription>
          Connect this metric to a Google Sheets cell.
        </DialogDescription>
      </DialogHeader>
      
      {boardSheets.length > 0 && (
        <div className="flex space-x-2 mt-4 mb-4">
          <Button 
            variant={showExistingView ? "default" : "outline"} 
            className="flex-1"
            onClick={() => setConnectionType('existing')}
          >
            Use Existing Sheet
          </Button>
          <Button 
            variant={showNewView ? "default" : "outline"} 
            className="flex-1"
            onClick={() => setConnectionType('new')}
          >
            Add New Sheet
          </Button>
        </div>
      )}
      
      {/* Content for using existing board-level sheets */}
      {showExistingView && (
        <div className="space-y-4 mt-4">
          {loadingSheets ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCwIcon className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Loading sheets...</span>
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
                  value={existingCellRange}
                  onChange={(e) => setExistingCellRange(e.target.value)}
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
                  value={existingSheetName}
                  onChange={(e) => setExistingSheetName(e.target.value)}
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
                  value={existingLabel}
                  onChange={(e) => setExistingLabel(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  A label for this metric (e.g., "Conversion Rate")
                </p>
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleExistingSheetConnection}
                >
                  <TableIcon className="h-4 w-4 mr-2" />
                  Connect
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
        
      {/* Content for adding a new sheet connection */}
      {showNewView && (
        <div className="space-y-4 mt-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  variant="outline"
                  onClick={testConnection}
                >
                  Test Connection
                </Button>
                <Button
                  type="button"
                  onClick={onClose}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button type="submit">
                  <TableIcon className="h-4 w-4 mr-2" />
                  Connect to Google Sheets
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </DialogContent>
  );
}