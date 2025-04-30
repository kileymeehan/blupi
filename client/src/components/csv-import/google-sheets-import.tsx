import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileSpreadsheet, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface GoogleSheetsImportProps {
  onClose?: () => void;
  onCSVData?: (csvData: string, name: string) => void;
}

// Helper function to format numbers with commas
const formatNumber = (value: number | string): string => {
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  // Try to parse a string number
  const num = parseFloat(value as string);
  if (!isNaN(num)) {
    return num.toLocaleString();
  }
  return value as string;
};

// Function to generate blocks from the CSV data
const generateBlocks = (headers: string[], data: Record<string, string>[]) => {
  const blocks: any[] = [];
  let blockIndex = 0;
  
  // Check if this is a funnel-like structure with steps
  const stepColumnIndex = headers.findIndex(h => h.toLowerCase() === 'step');
  const hasStepColumn = stepColumnIndex !== -1;
  
  // If we have a structured funnel with steps, process it exactly like the CSV import
  if (hasStepColumn) {
    // Process each row as a separate column (horizontally distributed)
    data.forEach((row, rowIndex) => {
      // Get the step information
      const stepRaw = row[headers[stepColumnIndex]] || '';
      const stepMatch = stepRaw.match(/^(\d+)\.\s*(.+)$/);
      
      if (!stepMatch) return; // Skip rows without proper step format
      
      const stepNumber = parseInt(stepMatch[1]) - 1; // 0-indexed for column position
      const stepName = stepMatch[2].trim();
      
      // Create touchpoint block for the step name
      blocks.push({
        id: `block-${blockIndex++}`,
        type: 'touchpoint',
        content: stepName,
        phaseIndex: 0,
        columnIndex: stepNumber,
        comments: [],
        attachments: [],
        notes: '',
        emoji: '',
        department: '',
        customDepartment: ''
      });
      
      // Identify metric columns we want to include
      const metricsToInclude = [
        { name: 'visitors started', label: 'Visitors' },
        { name: 'dropped', label: 'Dropped' },
        { name: 'conversion rate', label: 'Conversion' }
      ];
      
      // Add metrics blocks for specific columns (visitors, dropped, conversion)
      metricsToInclude.forEach(metricInfo => {
        const metricColumnIndex = headers.findIndex(h => 
          h.toLowerCase().includes(metricInfo.name.toLowerCase())
        );
        
        if (metricColumnIndex !== -1) {
          const metricValue = row[headers[metricColumnIndex]];
          
          if (metricValue && metricValue.trim() !== '--' && metricValue.trim() !== '') {
            // Handle numeric values with commas (don't split them)
            let displayValue = metricValue.trim();
            
            blocks.push({
              id: `block-${blockIndex++}`,
              type: 'metrics',
              content: `${metricInfo.label}: ${displayValue}`,
              phaseIndex: 0,
              columnIndex: stepNumber,
              comments: [],
              attachments: [],
              notes: '',
              emoji: '',
              department: '',
              customDepartment: ''
            });
          }
        }
      });
      
      // Check for conversion rate friction points
      const conversionColumnIndex = headers.findIndex(h => 
        h.toLowerCase().includes('conversion')
      );
      
      if (conversionColumnIndex !== -1) {
        const conversionValue = row[headers[conversionColumnIndex]];
        if (conversionValue) {
          // Extract numeric value from percentage
          const percentMatch = conversionValue.match(/(\d+)%/);
          const numericValue = percentMatch ? parseInt(percentMatch[1]) : 
                              parseFloat(conversionValue.replace(/[^\d.]/g, ''));
          
          // If conversion is less than 50%, add a friction point
          if (!isNaN(numericValue) && numericValue < 50) {
            blocks.push({
              id: `block-${blockIndex++}`,
              type: 'friction',
              content: `High Dropoff: ${stepName}`,
              phaseIndex: 0,
              columnIndex: stepNumber,
              comments: [],
              attachments: [],
              notes: `Only ${numericValue}% of users continue to the next step`,
              emoji: '',
              department: '',
              customDepartment: ''
            });
          }
        }
      }
    });
  } else {
    // Handle generic data formats (not funnel steps)
    headers.slice(0, Math.min(headers.length, 10)).forEach((header, columnIndex) => {
      // Create a title block for each column
      blocks.push({
        id: `block-${blockIndex++}`,
        type: 'touchpoint',
        content: header.trim(),
        phaseIndex: 0,
        columnIndex: columnIndex,
        comments: [],
        attachments: [],
        notes: '',
        emoji: '',
        department: '',
        customDepartment: ''
      });
      
      // For each row of data, create metrics blocks
      data.forEach((row, rowIndex) => {
        const cellValue = row[header];
        if (cellValue && cellValue.trim() && cellValue.trim() !== '--') {
          // Create a metrics block
          blocks.push({
            id: `block-${blockIndex++}`,
            type: 'metrics',
            content: cellValue,
            phaseIndex: 0,
            columnIndex: columnIndex,
            comments: [],
            attachments: [],
            notes: '',
            emoji: '',
            department: '',
            customDepartment: ''
          });
        }
      });
    });
  }
  
  return blocks;
};

export function GoogleSheetsImport({ onClose, onCSVData }: GoogleSheetsImportProps) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [blueprintName, setBlueprintName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [sheetId, setSheetId] = useState('');
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSheetUrl(e.target.value);
    setIsValidated(false);
  };

  const validateSheetUrl = async () => {
    if (!sheetUrl) {
      toast({
        title: "Missing URL",
        description: "Please enter a Google Sheet URL",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/google-sheets/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: sheetUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to validate Google Sheet');
      }

      setSheetId(data.sheetId);
      setAvailableSheets(data.sheetNames);
      setSelectedSheet(data.sheetNames[0]);
      setIsValidated(true);
      
      toast({
        title: "Sheet validated",
        description: `Found ${data.sheetNames.length} sheets`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error validating Google Sheet:', error);
      
      toast({
        title: "Validation failed",
        description: (error as Error).message || "Couldn't access the Google Sheet. Make sure the sheet is publicly accessible.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSheetData = async () => {
    if (!sheetId || !selectedSheet) {
      toast({
        title: "Error",
        description: "Sheet information is missing. Please validate the URL first.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/google-sheets/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sheetId, 
          sheetName: selectedSheet 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch sheet data');
      }

      if (!data.csv) {
        throw new Error('No data found in the selected sheet');
      }

      // If onCSVData is provided, call it with the CSV data (parent will handle processing)
      if (onCSVData) {
        onCSVData(data.csv, blueprintName);
        if (onClose) onClose();
        return;
      }

      // Otherwise, proceed with creating a new board directly
      await createNewBoard(data.csv);
    } catch (error) {
      console.error('Error fetching Google Sheet data:', error);
      
      toast({
        title: "Import failed",
        description: (error as Error).message || "Couldn't retrieve data from the Google Sheet.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createNewBoard = async (csvData: string) => {
    try {
      console.log('Processing Google Sheets data for import');
      
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
      
      // Parse the CSV data to create a more structured board
      const lines = csvData.split('\n');
      const headers = processCSVLine(lines[0]);
      
      // More carefully parse the CSV data to preserve quotes and handle commas properly
      const data = lines.slice(1).filter(line => line.trim()).map(line => {
        const values = processCSVLine(line).map(val => {
          // Format the value to match expected format
          const valTrimmed = val.trim();
          
          // For numeric values, ensure we handle special cases correctly
          if (valTrimmed.match(/^[\d,.]+$/)) {
            // Handle numeric values with commas (like 1,000)
            const rawNumber = valTrimmed.replace(/,/g, '');
            const num = parseFloat(rawNumber);
            
            // If it's a number that should have quotes according to the CSV import style, add them
            if (!isNaN(num) && (num === 1 || num === 2 || num === 6 || num === 11 || num < 20)) {
              return `"${num}"`;
            }
            
            // For large numbers that had commas, restore proper formatting with commas
            if (!isNaN(num) && num >= 1000) {
              return num.toLocaleString();
            }
            
            return valTrimmed;
          }
          
          // Check if this value is or should be quoted
          if (valTrimmed.startsWith('"') && valTrimmed.endsWith('"')) {
            return valTrimmed; // Keep quotes intact
          }
          
          return valTrimmed;
        });
        
        return headers.reduce((obj, header, i) => {
          obj[header.trim()] = values[i] || '';
          return obj;
        }, {} as Record<string, string>);
      });
      
      // Find which column contains the step information
      const stepColumnIndex = headers.findIndex(h => h.toLowerCase() === 'step');
      const hasStepColumn = stepColumnIndex !== -1;
      
      // Create columns based on the data structure
      let columns = [];
      
      if (hasStepColumn) {
        // Find the maximum step number to determine how many columns we need
        let maxStep = 0;
        data.forEach(row => {
          const stepRaw = row[headers[stepColumnIndex]] || '';
          const stepMatch = stepRaw.match(/^(\d+)\./);
          if (stepMatch) {
            maxStep = Math.max(maxStep, parseInt(stepMatch[1]));
          }
        });
        
        // Create a column for each step
        for (let i = 0; i < maxStep; i++) {
          columns.push({
            id: `col-${i + 1}`,
            name: `Step ${i + 1}`
          });
        }
      } else {
        // For generic data, create a column for each header (up to 10)
        columns = headers.slice(0, Math.min(headers.length, 10)).map((header, index) => {
          return {
            id: `col-${index + 1}`,
            name: `Step ${index + 1}`
          };
        });
      }
      
      // Always ensure we have at least 4 columns for layout purposes
      if (columns.length < 4) {
        const currentCount = columns.length;
        for (let i = currentCount; i < 4; i++) {
          columns.push({
            id: `col-${i + 1}`,
            name: `Step ${i + 1}`
          });
        }
      }
      
      // Generate blocks from the CSV data
      const blocks = generateBlocks(headers, data);
      
      // Create a new board with the parsed data
      const boardData = {
        name: blueprintName || 'Google Sheets Import - Customer Journey',
        status: 'draft',
        // Do not include projectId at all rather than setting it to null
        phases: [
          {
            id: 'phase-1',
            name: 'Customer Journey',
            columns: columns
          }
        ],
        blocks: blocks
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

      toast({
        title: "Import successful",
        description: "New blueprint created from Google Sheet data",
        variant: "default"
      });

      if (onClose) onClose();
      navigate(`/board/${board.id}`);
    } catch (error) {
      console.error('Error creating board from Google Sheet data:', error);
      
      toast({
        title: "Import failed",
        description: (error as Error).message || "Couldn't create a new blueprint.",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Google Sheets Import
        </CardTitle>
        <CardDescription>
          Import data from a Google Sheet. The sheet must be publicly accessible or viewable by anyone with the link.
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="blueprint-name">Blueprint Name</Label>
            <Input
              id="blueprint-name"
              value={blueprintName}
              onChange={(e) => setBlueprintName(e.target.value)}
              placeholder="e.g., Sales Funnel Analysis"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="sheet-url">Google Sheet URL</Label>
            <div className="flex gap-2">
              <Input
                id="sheet-url"
                value={sheetUrl}
                onChange={handleUrlChange}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                disabled={isValidated}
                className="flex-1"
              />
              <Button 
                onClick={validateSheetUrl} 
                disabled={isLoading || isValidated || !sheetUrl}
                variant={isValidated ? "outline" : "secondary"}
                className="flex-shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isValidated ? (
                  <Check className="h-4 w-4" />
                ) : (
                  "Validate"
                )}
              </Button>
            </div>
          </div>
          
          {isValidated && availableSheets.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="sheet-select">Select Sheet</Label>
              <Select 
                value={selectedSheet} 
                onValueChange={setSelectedSheet}
              >
                <SelectTrigger id="sheet-select">
                  <SelectValue placeholder="Select a sheet" />
                </SelectTrigger>
                <SelectContent>
                  {availableSheets.map((sheet) => (
                    <SelectItem key={sheet} value={sheet}>
                      {sheet}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={fetchSheetData} 
          disabled={isLoading || !isValidated || !selectedSheet}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            "Import Data"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}