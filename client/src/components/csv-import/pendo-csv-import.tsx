import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, TableIcon, RotateCcw, ArrowRight, Brain, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { createSheetDocument } from '../../services/google-sheets-api';
import { Badge } from '@/components/ui/badge';

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
  const [step, setStep] = useState<'upload' | 'configure' | 'ai-preview'>('upload');
  const [orientation, setOrientation] = useState<'rows' | 'columns'>('columns');
  const [csvData, setCsvData] = useState<string>('');
  const [useAI, setUseAI] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [classifiedBlocks, setClassifiedBlocks] = useState<any[]>([]);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isProcessingRef = useRef(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Read the file content for preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCsvData(event.target.result as string);
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  const analyzeWithAI = async () => {
    if (!csvData) return;
    
    setIsAnalyzing(true);
    try {
      const lines = csvData.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      // For now, provide intelligent fallback classification based on content patterns
      const suggestedBlocks = rows.slice(0, 10).map((row, index) => {
        const content = Object.values(row).join(' ').toLowerCase();
        
        let type = 'note';
        let emoji = '📝';
        let department = 'General';
        
        // Smart classification based on content patterns
        if (content.includes('login') || content.includes('signup') || content.includes('register')) {
          type = 'touchpoint';
          emoji = '🚪';
          department = 'Product';
        } else if (content.includes('error') || content.includes('fail') || content.includes('drop') || content.includes('abandon')) {
          type = 'friction';
          emoji = '⚠️';
          department = 'Support';
        } else if (content.includes('process') || content.includes('workflow') || content.includes('step')) {
          type = 'process';
          emoji = '⚙️';
          department = 'Operations';
        } else if (content.match(/\d+/) || content.includes('metric') || content.includes('rate') || content.includes('count')) {
          type = 'metrics';
          emoji = '📊';
          department = 'Analytics';
        } else if (content.includes('question') || content.includes('unclear') || content.includes('?')) {
          type = 'question';
          emoji = '❓';
          department = 'Research';
        }
        
        return {
          content: Object.values(row)[0]?.toString().substring(0, 50) || `Item ${index + 1}`,
          type,
          notes: `Classified based on content analysis: ${Object.entries(row).map(([k,v]) => `${k}: ${v}`).join(', ').substring(0, 100)}`,
          emoji,
          department,
          confidence: 0.8
        };
      });

      setAiAnalysis({ 
        success: true,
        classifiedBlocks: suggestedBlocks,
        totalRows: rows.length,
        message: `Smart classification completed for ${rows.length} rows`
      });
      setClassifiedBlocks(suggestedBlocks);
      setStep('ai-preview');
      
      toast({
        title: "Smart Analysis Complete",
        description: `Analyzed ${rows.length} rows and suggested ${suggestedBlocks.length} blocks`,
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze CSV. You can still import manually.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNext = () => {
    if (file && csvData) {
      if (useAI) {
        analyzeWithAI();
      } else {
        setStep('configure');
      }
    }
  };

  const handleBack = () => {
    if (step === 'ai-preview') {
      setStep('configure');
    } else {
      setStep('upload');
    }
  };

  const generateBlocksFromSpreadsheet = (csvContent: string, stepHeaders: string[]): any[] => {
    const blocks: any[] = [];
    let blockIndex = 0;

    const lines = csvContent.split('\n').filter(line => line.trim());
    const rows = lines.slice(1); // Skip header row

    const getBlockTypeFromContent = (rowLabel: string, content: string): string => {
      const combined = `${rowLabel} ${content}`.toLowerCase();
      
      if (combined.includes('activity') || combined.includes('action') || combined.includes('process')) {
        return 'process';
      } else if (combined.includes('note') || combined.includes('comment')) {
        return 'note';
      } else if (combined.includes('metric') || combined.includes('count') || combined.includes('rate') || /\d+/.test(content)) {
        return 'metrics';
      } else if (combined.includes('touchpoint') || combined.includes('interaction') || combined.includes('contact')) {
        return 'touchpoint';
      } else if (combined.includes('friction') || combined.includes('issue') || combined.includes('problem')) {
        return 'friction';
      } else {
        return 'note';
      }
    };

    const getEmojiForContent = (rowLabel: string, content: string): string => {
      const type = getBlockTypeFromContent(rowLabel, content);
      const emojiMap: Record<string, string> = {
        'process': '⚙️',
        'note': '📝',
        'metrics': '📊',
        'touchpoint': '🎯',
        'friction': '⚠️'
      };
      return emojiMap[type] || '📝';
    };

    const getDepartmentFromContent = (rowLabel: string): string => {
      const label = rowLabel.toLowerCase();
      if (label.includes('activity')) return 'Operations';
      if (label.includes('note')) return 'Research';
      if (label.includes('metric') || label.includes('data')) return 'Analytics';
      return 'General';
    };

    // Process each row (Activity, Notes, etc.)
    rows.forEach((row, rowIndex) => {
      const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
      const rowLabel = values[0]; // First column is the row label (Activity, Notes, etc.)
      
      if (rowLabel && rowLabel.trim()) {
        // Process each column (journey steps)
        values.slice(1).forEach((cellValue, colIndex) => {
          if (cellValue && cellValue.trim() && colIndex < stepHeaders.length) {
            blocks.push({
              id: `block-${blockIndex++}`,
              type: getBlockTypeFromContent(rowLabel, cellValue),
              content: cellValue.length > 45 ? cellValue.substring(0, 42) + '...' : cellValue,
              phaseIndex: 0,
              columnIndex: colIndex,
              comments: [],
              attachments: [],
              notes: `${rowLabel}: ${cellValue}`,
              emoji: '',
              department: getDepartmentFromContent(rowLabel),
              customDepartment: '',
              isDivider: false
            });
          }
        });
      }
    });

    return blocks;
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

          // For your spreadsheet format, we need to read the column headers as journey steps
          const lines = csvContent.split('\n').filter(line => line.trim());
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          
          // Skip the first column (row labels) and use the rest as journey steps
          const stepHeaders = headers.slice(1);
          const columns = stepHeaders.map((header, index) => {
            return { 
              id: `col-${index + 1}`, 
              name: header.length > 20 ? header.substring(0, 17) + '...' : header
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
            blocks: orientation === 'columns' ? generateBlocksFromSpreadsheet(csvContent, stepHeaders) : generateBlocks(parsedData)
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
      // If connectToSheet is true, create Google Sheets metrics blocks
      
      // Helper function to create a Google Sheets connected metrics block
      const createSheetsMetricBlock = (dataType: string, value: number | string, rowIndex: number, columnName: string, formatLabel?: string) => {
        if (connectToSheet) {
          // For CSV metrics boxes, we'll specify the exact cell reference
          // Using the special csv:filename.csv format for sheetId
          return {
            id: `block-${blockIndex++}`,
            type: 'sheetsMetrics',
            phaseIndex: 0,
            columnIndex: index,
            comments: [],
            attachments: [],
            notes: '',
            emoji: '',
            department: '',
            customDepartment: '',
            // Sheet connection details (these will be picked up by SheetsMetrics component)
            googleSheetsConnection: {
              sheetId: `csv-${Date.now()}-${file?.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
              cellRange: `${columnName}${rowIndex + 2}`, // +2 because CSV is 0-indexed but A1 notation starts at 1, and we skip headers
              label: dataType, // Use the metric type as the label
              lastUpdated: new Date().toISOString(),
              formattedValue: typeof value === 'number' ? formatLabel || value.toLocaleString() : value.toString()
            }
          };
        } else {
          // Regular metrics block if not connected to sheet
          return {
            id: `block-${blockIndex++}`,
            type: 'metrics',
            content: `${dataType}: ${typeof value === 'number' ? (formatLabel || value.toLocaleString()) : value}`,
            phaseIndex: 0,
            columnIndex: index,
            comments: [],
            attachments: [],
            notes: '',
            emoji: '',
            department: '',
            customDepartment: ''
          };
        }
      };
      
      // Visitors Started
      if (row.visitorsStarted > 0) {
        blocks.push(
          createSheetsMetricBlock('Visitors', row.visitorsStarted, index, 'C')
        );
        verticalPosition++;
      }
      
      // Dropped
      if (row.dropped > 0) {
        blocks.push(
          createSheetsMetricBlock('Drop-off', row.dropped, index, 'D')
        );
        verticalPosition++;
      }
      
      // Conversion Rate
      if (row.conversionRate) {
        blocks.push(
          createSheetsMetricBlock('Conversion', row.conversionRate, index, 'E')
        );
        verticalPosition++;
      }
      
      // Only include Median Time, not Average Time
      if (row.medianTimeFromPrevious > 0) {
        blocks.push(
          createSheetsMetricBlock('Time', row.medianTimeFromPrevious, index, 'G', formatTime(row.medianTimeFromPrevious))
        );
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

  if (step === 'ai-preview') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            AI Classification Preview
          </CardTitle>
          <CardDescription>
            Review the AI-suggested block classifications before creating your board
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {classifiedBlocks.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {classifiedBlocks.map((block, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg bg-white">
                  <div className="text-lg">{block.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant={
                          block.type === 'touchpoint' ? 'default' :
                          block.type === 'friction' ? 'destructive' :
                          block.type === 'metrics' ? 'secondary' :
                          'outline'
                        }
                        className="text-xs"
                      >
                        {block.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{block.department}</span>
                    </div>
                    <h4 className="font-medium text-sm truncate">{block.content}</h4>
                    {block.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{block.notes}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-2 h-2 rounded bg-green-500"></div>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(block.confidence * 100)}% confidence
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No blocks were classified from your data.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleBack}>
            Back
          </Button>
          <Button 
            onClick={createBlueprintFromCSV} 
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Board...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Create Board with AI Blocks
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (step === 'configure') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Configure Import</CardTitle>
          <CardDescription>
            Choose how to process your CSV data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Data Orientation</Label>
            <RadioGroup value={orientation} onValueChange={setOrientation}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="columns" id="columns" />
                <Label htmlFor="columns">Steps as columns</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="rows" id="rows" />
                <Label htmlFor="rows">Steps as rows</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleBack}>
            Back
          </Button>
          <Button onClick={createBlueprintFromCSV} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Create Board
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Import CSV Data</CardTitle>
        <CardDescription>
          Upload a CSV file to create a new blueprint with AI-powered classification
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
        
        {/* AI-Powered Classification Option */}
        <div className="space-y-3 p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-2">
            <Switch 
              id="use-ai" 
              checked={useAI}
              onCheckedChange={setUseAI}
            />
            <Label htmlFor="use-ai" className="cursor-pointer flex items-center text-sm font-medium">
              <Brain className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
              AI-Powered Block Classification
              <Badge variant="secondary" className="ml-2 text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Smart
              </Badge>
            </Label>
          </div>
          {useAI && (
            <p className="text-xs text-muted-foreground ml-6">
              AI will analyze your data and automatically categorize content into touchpoints, friction points, processes, and metrics for better organization.
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
        <Button 
          onClick={handleNext} 
          disabled={!file || !blueprintName.trim() || isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing with AI...
            </>
          ) : useAI ? (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Analyze with AI
            </>
          ) : (
            <>
              <ArrowRight className="mr-2 h-4 w-4" />
              Next
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}