import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";

import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { TableIcon, RefreshCwIcon } from "lucide-react";

import { validateSheetUrl, getBoardSheetDocuments, fetchSheetCell } from "@/services/google-sheets-api";

const connectionFormSchema = z.object({
  sheetUrl: z.string().url('Please enter a valid Google Sheets URL'),
  cellRange: z.string().min(1, 'Cell reference is required (e.g., A1)'),
  sheetName: z.string().optional(),
  label: z.string().optional(),
});

type ConnectionFormValues = z.infer<typeof connectionFormSchema>;

interface BoardSheet {
  id: string;
  boardId: number;
  name: string;
  sheetId: string;
  createdAt: string;
  updatedAt: string;
}

interface SheetsConnectionDialogProps {
  boardId: number;
  initialConnection?: {
    sheetId: string;
    sheetName?: string;
    cellRange: string;
    label?: string;
    lastUpdated?: string;
    formattedValue?: string;
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

export function SheetsConnectionDialog({
  boardId,
  initialConnection,
  onClose,
  onUpdate,
  testGoogleSheetsApi
}: SheetsConnectionDialogProps) {
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [boardSheets, setBoardSheets] = useState<BoardSheet[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Default to 'existing' if there are sheets available or initialConnection exists
  const [activeTab, setActiveTab] = useState<string>(
    initialConnection || boardSheets.length > 0 ? 'existing' : 'new'
  );
  
  // Set existing connection values
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');
  const [existingCellRange, setExistingCellRange] = useState(initialConnection?.cellRange || '');
  const [existingSheetName, setExistingSheetName] = useState(initialConnection?.sheetName || '');
  const [existingLabel, setExistingLabel] = useState(initialConnection?.label || '');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Create form for new connection
  const form = useForm<ConnectionFormValues>({
    resolver: zodResolver(connectionFormSchema),
    defaultValues: {
      sheetUrl: initialConnection?.sheetId ? `https://docs.google.com/spreadsheets/d/${initialConnection.sheetId}/edit` : '',
      cellRange: initialConnection?.cellRange || '',
      sheetName: initialConnection?.sheetName || '',
      label: initialConnection?.label || '',
    }
  });
  
  // Load board sheets on mount
  useEffect(() => {
    const fetchBoardSheets = async () => {
      if (!boardId) {
        console.warn('No boardId provided to SheetsConnectionDialog');
        return;
      }
      
      setLoadingSheets(true);
      try {
        // Get sheets for this board
        const sheets = await getBoardSheetDocuments(boardId);
        console.log(`Found ${sheets.length} sheets for board ${boardId}`);
        
        setBoardSheets(sheets);
        
        // If there are sheets or initialConnection exists, default to 'existing' tab
        if (sheets.length > 0 || initialConnection) {
          setActiveTab('existing');
        }
        
        // If we have an initialConnection, find matching sheet
        if (initialConnection?.sheetId) {
          const matchingSheet = sheets.find(s => s.sheetId === initialConnection.sheetId);
          if (matchingSheet) {
            setSelectedSheetId(matchingSheet.id);
          } else if (sheets.length > 0) {
            setSelectedSheetId(sheets[0].id);
          }
        } else if (sheets.length > 0 && !selectedSheetId) {
          setSelectedSheetId(sheets[0].id);
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
    
    fetchBoardSheets();
  }, [boardId, initialConnection, toast, selectedSheetId]);
  
  // Handle connecting with an existing sheet
  const handleExistingSheetConnection = async () => {
    if (!selectedSheetId) {
      toast({
        title: "Error",
        description: "Please select a sheet",
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
    
    setIsProcessing(true);
    
    try {
      const selectedSheet = boardSheets.find(s => s.id === selectedSheetId);
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
        description: "Connecting and fetching data...",
      });
      
      // Fetch the cell data
      let cellData;
      
      // Special case for Test sheet
      if (selectedSheet.sheetId === "1zW6Tru8P0dBGTzI0UvQnOgJR5BQ-nldCQsvdmD-lLPU") {
        console.log("Using mock data for Test sheet:", existingCellRange);
        cellData = await fetchSheetCell(
          selectedSheet.sheetId,
          existingCellRange,
          existingSheetName || undefined
        );
      } else {
        // For other sheets, use normal API call
        cellData = await fetchSheetCell(
          selectedSheet.sheetId,
          existingCellRange,
          existingSheetName || undefined
        );
      }
      
      // Update the connection
      onUpdate({
        sheetId: selectedSheet.sheetId,
        sheetName: existingSheetName || undefined,
        cellRange: existingCellRange,
        label: existingLabel || undefined,
        lastUpdated: new Date().toISOString(),
        formattedValue: cellData?.formattedValue || cellData?.value || ''
      });
      
      toast({
        title: "Connection successful",
        description: `Connected to ${selectedSheet.name}. Retrieved value: ${cellData?.formattedValue || cellData?.value || 'N/A'}`,
      });
      
      onClose();
    } catch (error) {
      console.error('Error connecting to sheet:', error);
      toast({
        title: "Connection failed",
        description: String(error).includes("Too Many Requests") 
          ? "Google Sheets API rate limit reached. Please try again in a minute."
          : String(error),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle form submission for new connection
  const onSubmit = async (data: ConnectionFormValues) => {
    setIsProcessing(true);
    
    try {
      // Show processing toast
      toast({
        title: "Processing",
        description: "Connecting to Google Sheets and fetching data...",
      });
      
      // Validate the sheet URL
      const validationResult = await validateSheetUrl(data.sheetUrl);
      if (!validationResult.valid) {
        toast({
          title: "Invalid URL",
          description: validationResult.message || "Please enter a valid Google Sheets URL",
          variant: "destructive",
        });
        return;
      }
      
      // Fetch the cell data
      const cellData = await fetchSheetCell(
        validationResult.sheetId!,
        data.cellRange,
        data.sheetName || undefined
      );
      
      // Update the connection
      onUpdate({
        sheetId: validationResult.sheetId!,
        sheetName: data.sheetName || undefined,
        cellRange: data.cellRange,
        label: data.label || undefined,
        lastUpdated: new Date().toISOString(),
        formattedValue: cellData?.formattedValue || cellData?.value || ''
      });
      
      toast({
        title: "Connection successful",
        description: `Connected to sheet. Retrieved value: ${cellData?.formattedValue || cellData?.value || 'N/A'}`,
      });
      
      // Invalidate board sheets query to refresh the list
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${boardId}/sheet-documents`] });
      
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Connection failed",
        description: String(error).includes("Too Many Requests") 
          ? "Google Sheets API rate limit reached. Please try again in a minute."
          : String(error),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Refresh sheet list
  const refreshSheets = async () => {
    setLoadingSheets(true);
    try {
      const sheets = await getBoardSheetDocuments(boardId);
      setBoardSheets(sheets);
      toast({
        title: "Sheet list refreshed",
        description: `Found ${sheets.length} sheets for this board`,
      });
    } catch (error) {
      console.error('Error refreshing sheets:', error);
      toast({
        title: "Refresh failed",
        description: "Failed to refresh sheet list",
        variant: "destructive",
      });
    } finally {
      setLoadingSheets(false);
    }
  };
  
  return (
    <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Connect to Google Sheets</DialogTitle>
        <DialogDescription>
          Connect this block to a Google Sheets cell
        </DialogDescription>
      </DialogHeader>
      
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="mt-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger 
            value="existing" 
            disabled={boardSheets.length === 0 && !initialConnection}
          >
            Use Existing Sheet {boardSheets.length > 0 && `(${boardSheets.length})`}
          </TabsTrigger>
          <TabsTrigger value="new">Add New Sheet</TabsTrigger>
        </TabsList>
        
        <TabsContent value="existing" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Select a connected sheet</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshSheets}
              disabled={loadingSheets}
            >
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <FormLabel>Sheet Connection</FormLabel>
                <Select 
                  value={selectedSheetId} 
                  onValueChange={setSelectedSheetId}
                  disabled={loadingSheets || boardSheets.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a sheet connection" />
                  </SelectTrigger>
                  <SelectContent>
                    {boardSheets.map((sheet) => (
                      <SelectItem key={sheet.id} value={sheet.id}>
                        {sheet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select a sheet connection from this board
                </FormDescription>
              </div>
              
              <div className="space-y-2">
                <FormLabel>Sheet Name (Tab)</FormLabel>
                <Input 
                  placeholder="e.g., Sheet1 or funnel-list (optional)" 
                  value={existingSheetName || ''}
                  onChange={(e) => setExistingSheetName(e.target.value)}
                />
                <FormDescription>
                  Enter the sheet tab name (optional)
                </FormDescription>
              </div>
              
              <div className="space-y-2">
                <FormLabel>Cell Reference</FormLabel>
                <Input 
                  placeholder="e.g., A1 or B2" 
                  value={existingCellRange}
                  onChange={(e) => setExistingCellRange(e.target.value)}
                />
                <FormDescription>
                  Enter the cell reference in A1 notation
                </FormDescription>
              </div>
              
              <div className="space-y-2">
                <FormLabel>Label (Optional)</FormLabel>
                <Input 
                  placeholder="e.g., Monthly Revenue" 
                  value={existingLabel || ''}
                  onChange={(e) => setExistingLabel(e.target.value)}
                />
                <FormDescription>
                  A label for this metric
                </FormDescription>
              </div>
            </div>
            
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
                onClick={onClose}
                variant="outline"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleExistingSheetConnection}
                disabled={isProcessing || !selectedSheetId || !existingCellRange}
              >
                <TableIcon className="h-4 w-4 mr-2" />
                Connect
              </Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="new" className="mt-4">
          <FormProvider {...form}>
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
                      Enter the full URL of your Google Sheet
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
                    <FormLabel>Sheet Name (Tab)</FormLabel>
                    <FormControl>
                      <Input placeholder="Sheet1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the sheet name/tab (optional)
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
                      <Input placeholder="e.g., A1 or B2" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the cell reference in A1 notation
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
                      <Input placeholder="e.g., Monthly Revenue" {...field} />
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
                  onClick={onClose}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isProcessing}>
                  <TableIcon className="h-4 w-4 mr-2" />
                  Connect to Google Sheets
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
}