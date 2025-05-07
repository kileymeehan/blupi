import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, TableIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Switch } from '@/components/ui/switch';
import { createSheetDocument } from '../../services/google-sheets-api';

interface CSVRow {
  step: string;
  filters: string;
  visitorsStarted: number;
  dropped: number;
  conversionRate: string;
  avgTimeFromPrevious: number;
  medianTimeFromPrevious: number;
}

interface PendoCSVImportProps {
  onClose?: () => void;
}

export function PendoCSVImport({ onClose }: PendoCSVImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [blueprintName, setBlueprintName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectToSheet, setConnectToSheet] = useState(true);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isProcessingRef = useRef(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const parseCSV = (csvContent: string): CSVRow[] => {
    // First, properly handle CSV by processing quoted fields correctly
    const processCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let inQuotes = false;
      let currentField = '';
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
          continue;
        }
        
        if (char === ',' && !inQuotes) {
          result.push(currentField.trim());
          currentField = '';
          continue;
        }
        
        currentField += char;
      }
      
      // Don't forget to push the last field
      result.push(currentField.trim());
      
      return result;
    };
    
    const lines = csvContent.split('\n');
    const headers = processCSVLine(lines[0]);
    
    // Skip header row
    const rows = lines.slice(1).filter(line => line.trim().length > 0);
    
    return rows.map(row => {
      const values = processCSVLine(row);
      
      // Parse numeric values correctly - preserve commas for display but convert for calculations
      const parseNumericValue = (value: string): number => {
        if (!value || value === '--') return 0;
        // Remove non-numeric characters, but keep the numeric value
        return parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
      };
      
      return {
        step: values[0] || '',
        filters: values[1] || '',
        visitorsStarted: parseNumericValue(values[2]),
        dropped: parseNumericValue(values[3]),
        conversionRate: values[4] || '0%',
        avgTimeFromPrevious: parseNumericValue(values[5]),
        medianTimeFromPrevious: parseNumericValue(values[6])
      };
    });
  };

  const createBlueprintFromCSV = async () => {
    try {
      setIsLoading(true);
      
      if (!file) {
        toast({
          title: 'No file selected',
          description: 'Please select a CSV file to import',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      if (!blueprintName.trim()) {
        toast({
          title: 'Blueprint name required',
          description: 'Please enter a name for the new blueprint',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      // Read the file content
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          // Prevent duplicate processing
          if (isProcessingRef.current) return;
          isProcessingRef.current = true;
          
          if (!event.target?.result) return;
          
          const csvContent = event.target.result as string;
          const parsedData = parseCSV(csvContent);
          
          if (parsedData.length === 0) {
            toast({
              title: 'Invalid CSV format',
              description: 'Could not parse any data from the CSV file',
              variant: 'destructive'
            });
            setIsLoading(false);
            isProcessingRef.current = false;
            return;
          }

          // Create a new board with a column for each step in the funnel
          const columns = parsedData.map((row, index) => {
            return { 
              id: `col-${index + 1}`, 
              name: `Step ${index + 1}` // Use "Step X" instead of the actual step name
            };
          });
          
          // Create blueprint directly without creating a project first
          // Don't send projectId at all instead of sending null
          const boardData = {
            name: blueprintName, // Use the blueprint name directly
            status: 'draft',
            phases: [
              {
                id: 'phase-1',
                name: 'Customer Journey',
                columns: columns
              }
            ],
            blocks: generateBlocks(parsedData)
          };
          
          console.log('Sending board creation request:', boardData);
          
          const boardResponse = await fetch('/api/boards', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(boardData)
          });

          if (!boardResponse.ok) {
            const errorData = await boardResponse.json();
            console.error('Server error:', errorData);
            throw new Error(errorData.message || 'Failed to create blueprint');
          }

          const board = await boardResponse.json();
          
          // If the user wants to connect the CSV as a Google Sheet
          if (connectToSheet) {
            try {
              // Create a CSV blob and simulate a file upload to Google Drive
              // using existing APIs to connect the board to the sheet data
              console.log('Connecting CSV to board as a sheet document...');
              
              // Create a sheet document for the board
              await createSheetDocument(
                board.id, 
                `${blueprintName} Data`, 
                // Note: This is a special URL format that signals to the API
                // that this is a local CSV file, not an actual Google Sheet
                `csv:${file.name}`
              );
              
              toast({
                title: 'Sheet Connected',
                description: 'CSV data has been linked to the board for use in metrics boxes',
                variant: 'default'
              });
            } catch (error) {
              console.error('Failed to connect CSV as sheet:', error);
              toast({
                title: 'Sheet Connection Failed',
                description: 'Blueprint was created, but CSV data could not be connected as a sheet',
                variant: 'destructive'
              });
            }
          }
          
          toast({
            title: 'Import Successful',
            description: 'Created new blueprint from Pendo funnel data',
            variant: 'default'
          });
          
          // Navigate to the new board (using singular "board" not plural "boards")
          navigate(`/board/${board.id}`);
          
          if (onClose) {
            onClose();
          }
        } catch (error) {
          console.error('Error processing CSV data:', error);
          toast({
            title: 'Import failed',
            description: error instanceof Error ? error.message : 'Failed to process CSV data',
            variant: 'destructive'
          });
          setIsLoading(false);
        }
      };
      
      reader.onerror = () => {
        toast({
          title: 'Error reading file',
          description: 'Could not read the CSV file',
          variant: 'destructive'
        });
        setIsLoading(false);
      };
      
      reader.readAsText(file);
      
    } catch (error) {
      console.error('Error importing CSV:', error);
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Failed to import CSV data',
        variant: 'destructive'
      });
      setIsLoading(false);
    }
  };

  // Generate blocks from CSV data
  const generateBlocks = (data: CSVRow[]) => {
    const blocks: any[] = [];
    let blockIndex = 0;
    
    // No longer add front-stage divider at the top
    
    // Process each row of funnel data
    data.forEach((row, index) => {
      // Extract step name (remove numbering prefix)
      const stepName = row.step.replace(/^\d+\.\s*/, '').trim();
      let verticalPosition = 0; // Used to stack blocks vertically in the same column
      
      // Create touchpoint block with "Step X" name (not in the content)
      blocks.push({
        id: `block-${blockIndex++}`,
        type: 'touchpoint',
        content: stepName, // Original step name without the number prefix
        phaseIndex: 0,
        columnIndex: index, // Each step gets its own column
        comments: [],
        attachments: [],
        notes: '',
        emoji: '',
        department: '', // No default department
        customDepartment: ''
      });
      
      verticalPosition++; // Move down for the next block
      
      // Create individual metrics blocks for each metric
      
      // Visitors Started
      if (row.visitorsStarted > 0) {
        blocks.push({
          id: `block-${blockIndex++}`,
          type: 'metrics',
          content: `Visitors: ${row.visitorsStarted.toLocaleString()}`,
          phaseIndex: 0,
          columnIndex: index,
          comments: [],
          attachments: [],
          notes: '',
          emoji: '',
          department: '', // No default department
          customDepartment: ''
        });
        verticalPosition++;
      }
      
      // Dropped
      if (row.dropped > 0) {
        blocks.push({
          id: `block-${blockIndex++}`,
          type: 'metrics',
          content: `Drop-off: ${row.dropped.toLocaleString()}`,
          phaseIndex: 0,
          columnIndex: index,
          comments: [],
          attachments: [],
          notes: '',
          emoji: '',
          department: '', // No default department
          customDepartment: ''
        });
        verticalPosition++;
      }
      
      // Conversion Rate
      if (row.conversionRate) {
        blocks.push({
          id: `block-${blockIndex++}`,
          type: 'metrics',
          content: `Conversion: ${row.conversionRate}`,
          phaseIndex: 0,
          columnIndex: index,
          comments: [],
          attachments: [],
          notes: '',
          emoji: '',
          department: '', // No default department
          customDepartment: ''
        });
        verticalPosition++;
      }
      
      // Only include Median Time, not Average Time
      if (row.medianTimeFromPrevious > 0) {
        blocks.push({
          id: `block-${blockIndex++}`,
          type: 'metrics',
          content: `Time: ${formatTime(row.medianTimeFromPrevious)}`,
          phaseIndex: 0,
          columnIndex: index,
          comments: [],
          attachments: [],
          notes: '',
          emoji: '',
          department: '', // No default department
          customDepartment: ''
        });
        verticalPosition++;
      }
      
      // Only create a friction block if conversion rate is less than 50%
      // Parse conversion rate to get numeric value (remove % sign)
      const conversionRateValue = parseInt(row.conversionRate?.replace('%', '') || '100');
      if (conversionRateValue < 50) {
        blocks.push({
          id: `block-${blockIndex++}`,
          type: 'friction',
          content: `High Dropoff at ${conversionRateValue}%`,
          phaseIndex: 0,
          columnIndex: index,
          comments: [],
          attachments: [],
          notes: `High drop-off point at ${stepName}. Conversion rate: ${conversionRateValue}%`,
          emoji: '',
          department: '', 
          customDepartment: ''
        });
        verticalPosition++;
      }
    });
    
    return blocks;
  };
  
  // Helper function to format time in seconds to human-readable format with more precision
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      // Less than a minute - show seconds
      return `${seconds.toFixed(1)} sec`;
    } else if (seconds < 3600) {
      // Less than an hour - show minutes and seconds
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes} min ${remainingSeconds} sec`;
    } else if (seconds < 86400) {
      // Less than a day - show hours and minutes
      const hours = Math.floor(seconds / 3600);
      const remainingMinutes = Math.floor((seconds % 3600) / 60);
      return `${hours} hrs ${remainingMinutes} min`;
    } else {
      // More than a day - show days and hours
      const days = Math.floor(seconds / 86400);
      const remainingHours = Math.floor((seconds % 86400) / 3600);
      return `${days} days ${remainingHours} hrs`;
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Import Pendo Funnel Data</CardTitle>
        <CardDescription>
          Create a new blueprint from a Pendo funnel CSV export
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="blueprintName">Blueprint Name</Label>
          <Input
            id="blueprintName"
            placeholder="Enter blueprint name"
            value={blueprintName}
            onChange={(e) => setBlueprintName(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="csvFile">Pendo Funnel CSV</Label>
          <div className="flex items-center gap-2">
            <Input
              id="csvFile"
              type="file"
              accept=".csv"
              className="flex-1"
              onChange={handleFileChange}
            />
          </div>
          {file && (
            <p className="text-xs text-muted-foreground">
              Selected file: {file.name}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch 
            id="connect-sheet" 
            checked={connectToSheet}
            onCheckedChange={setConnectToSheet}
          />
          <Label htmlFor="connect-sheet" className="cursor-pointer flex items-center text-sm">
            <TableIcon className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            Connect CSV as board-level Google Sheet
          </Label>
        </div>
        
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={createBlueprintFromCSV} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Blueprint...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Create Blueprint
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}