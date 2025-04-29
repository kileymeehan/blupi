import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

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
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

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

      if (!projectName.trim()) {
        toast({
          title: 'Project name required',
          description: 'Please enter a name for the new project',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      // Read the file content
      const reader = new FileReader();
      
      reader.onload = async (event) => {
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
          return;
        }

        // Create new project
        const projectResponse = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: projectName,
            color: '#A1D9F5',
            status: 'draft'
          })
        });

        if (!projectResponse.ok) {
          throw new Error('Failed to create project');
        }

        const project = await projectResponse.json();
        
        // Create a new board with a column for each step in the funnel
        const columns = parsedData.map((row, index) => {
          // Extract step name without numbering prefix
          const stepName = row.step.replace(/^\d+\.\s*/, '').trim();
          return { 
            id: `col-${index + 1}`, 
            name: stepName 
          };
        });
        
        const boardResponse = await fetch('/api/boards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: `${projectName} - Customer Journey`,
            projectId: project.id,
            status: 'draft',
            phases: [
              {
                id: 'phase-1',
                name: 'Customer Journey',
                columns: columns
              }
            ],
            blocks: generateBlocks(parsedData)
          })
        });

        if (!boardResponse.ok) {
          throw new Error('Failed to create board');
        }

        const board = await boardResponse.json();
        
        toast({
          title: 'Import Successful',
          description: 'Created new blueprint from Pendo funnel data',
          variant: 'default'
        });
        
        // Navigate to the new board
        navigate(`/board/${board.id}`);
        
        if (onClose) {
          onClose();
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
    const blocks = [];
    let blockIndex = 0;
    
    // Add front-stage divider at the top spanning all columns
    blocks.push({
      id: `block-${blockIndex++}`,
      type: 'front-stage',
      content: 'CUSTOMER FACING',
      phaseIndex: 0,
      columnIndex: 0, // First column
      comments: [],
      attachments: [],
      notes: '',
      emoji: '',
      customDepartment: '',
      isDivider: true
    });
    
    // Process each row of funnel data
    data.forEach((row, index) => {
      // Extract step name (remove numbering prefix)
      const stepName = row.step.replace(/^\d+\.\s*/, '').trim();
      let verticalPosition = 0; // Used to stack blocks vertically in the same column
      
      // Create touchpoint block for this step in its own column
      blocks.push({
        id: `block-${blockIndex++}`,
        type: 'touchpoint',
        content: stepName,
        phaseIndex: 0,
        columnIndex: index, // Each step gets its own column
        comments: [],
        attachments: [],
        notes: '',
        emoji: '',
        department: 'Marketing',
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
          department: 'Analytics',
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
          department: 'Analytics',
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
          department: 'Analytics',
          customDepartment: ''
        });
        verticalPosition++;
      }
      
      // Average Time
      if (row.avgTimeFromPrevious > 0) {
        blocks.push({
          id: `block-${blockIndex++}`,
          type: 'metrics',
          content: `Avg. Time: ${formatTime(row.avgTimeFromPrevious)}`,
          phaseIndex: 0,
          columnIndex: index,
          comments: [],
          attachments: [],
          notes: '',
          emoji: '',
          department: 'Analytics',
          customDepartment: ''
        });
        verticalPosition++;
      }
      
      // Create friction block if there's significant drop-off (> 30%)
      // Parse conversion rate to get numeric value (remove % sign)
      const conversionRateValue = parseInt(row.conversionRate?.replace('%', '') || '100');
      if (conversionRateValue < 70) {
        blocks.push({
          id: `block-${blockIndex++}`,
          type: 'friction',
          content: `Friction point: ${stepName}`,
          phaseIndex: 0,
          columnIndex: index,
          comments: [],
          attachments: [],
          notes: `High drop-off point at ${stepName}. Investigate user experience issues.`,
          emoji: '',
          department: 'UX',
          customDepartment: ''
        });
        verticalPosition++;
      }
      
      // Add process block for backend activity if it's not the first step
      if (index > 0) {
        blocks.push({
          id: `block-${blockIndex++}`,
          type: 'process',
          content: `Process ${stepName} request`,
          phaseIndex: 0,
          columnIndex: index,
          comments: [],
          attachments: [],
          notes: '',
          emoji: '',
          department: 'Engineering',
          customDepartment: ''
        });
      }
    });
    
    // Add back-stage divider at the bottom spanning all columns
    blocks.push({
      id: `block-${blockIndex++}`,
      type: 'back-stage',
      content: 'BACKEND PROCESSES',
      phaseIndex: 0,
      columnIndex: 0, // First column 
      comments: [],
      attachments: [],
      notes: '',
      emoji: '',
      customDepartment: '',
      isDivider: true
    });
    
    return blocks;
  };
  
  // Helper function to format time in seconds to human-readable format
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)} sec`;
    } else if (seconds < 3600) {
      return `${(seconds / 60).toFixed(1)} min`;
    } else if (seconds < 86400) {
      return `${(seconds / 3600).toFixed(1)} hrs`;
    } else {
      return `${(seconds / 86400).toFixed(1)} days`;
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
          <Label htmlFor="projectName">Project Name</Label>
          <Input
            id="projectName"
            placeholder="Enter project name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
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