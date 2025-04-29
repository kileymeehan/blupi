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
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    
    // Skip header row
    const rows = lines.slice(1).filter(line => line.trim().length > 0);
    
    return rows.map(row => {
      const values = row.split(',');
      const cleanValues = values.map(val => val.replace(/"/g, '').trim());
      
      return {
        step: cleanValues[0] || '',
        filters: cleanValues[1] || '',
        visitorsStarted: parseInt(cleanValues[2]?.replace(/[^0-9]/g, '') || '0'),
        dropped: parseInt(cleanValues[3]?.replace(/[^0-9]/g, '') || '0'),
        conversionRate: cleanValues[4] || '0%',
        avgTimeFromPrevious: parseFloat(cleanValues[5] || '0'),
        medianTimeFromPrevious: parseFloat(cleanValues[6] || '0')
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
        
        // Create a new board
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
                columns: [
                  { id: 'col-1', name: 'Touchpoint' },
                  { id: 'col-2', name: 'Metrics' }
                ]
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
    
    // Add front-stage divider
    blocks.push({
      id: `block-${blockIndex++}`,
      type: 'front-stage',
      content: 'CUSTOMER FACING',
      phaseIndex: 0,
      columnIndex: 0,
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
      
      // Create touchpoint block for this step
      blocks.push({
        id: `block-${blockIndex++}`,
        type: 'touchpoint',
        content: stepName,
        phaseIndex: 0,
        columnIndex: 0,
        comments: [],
        attachments: [],
        notes: '',
        emoji: '',
        department: 'Marketing',
        customDepartment: ''
      });
      
      // Create metrics block with conversion and time data
      const metricsContent = `Visitors: ${row.visitorsStarted.toLocaleString()}
${row.dropped > 0 ? `Drop-off: ${row.dropped.toLocaleString()}` : ''}
Conversion: ${row.conversionRate}
${row.avgTimeFromPrevious > 0 ? `Avg. Time: ${formatTime(row.avgTimeFromPrevious)}` : ''}`;
      
      blocks.push({
        id: `block-${blockIndex++}`,
        type: 'metrics',
        content: metricsContent,
        phaseIndex: 0,
        columnIndex: 1,
        comments: [],
        attachments: [],
        notes: '',
        emoji: '',
        department: 'Analytics',
        customDepartment: ''
      });
      
      // Create friction block if there's significant drop-off (> 30%)
      if (row.conversionRate && parseInt(row.conversionRate) < 70) {
        blocks.push({
          id: `block-${blockIndex++}`,
          type: 'friction',
          content: `Friction point: ${stepName}`,
          phaseIndex: 0,
          columnIndex: 1,
          comments: [],
          attachments: [],
          notes: `High drop-off point at ${stepName}. Investigate user experience issues.`,
          emoji: '',
          department: 'UX',
          customDepartment: ''
        });
      }
      
      // Add process block for backend activity if it's not the first step
      if (index > 0) {
        blocks.push({
          id: `block-${blockIndex++}`,
          type: 'process',
          content: `Process ${stepName} request`,
          phaseIndex: 0,
          columnIndex: 0,
          comments: [],
          attachments: [],
          notes: '',
          emoji: '',
          department: 'Engineering',
          customDepartment: ''
        });
      }
    });
    
    // Add back-stage divider
    blocks.push({
      id: `block-${blockIndex++}`,
      type: 'back-stage',
      content: 'BACKEND PROCESSES',
      phaseIndex: 0,
      columnIndex: 0,
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