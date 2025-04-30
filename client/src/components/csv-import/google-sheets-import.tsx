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

export function GoogleSheetsImport({ onClose, onCSVData }: GoogleSheetsImportProps) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [projectName, setProjectName] = useState('');
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
        onCSVData(data.csv, projectName);
        if (onClose) onClose();
        return;
      }

      // Otherwise, proceed with creating a new board directly
      await createNewBoard(data.csv);
    } catch (error) {
      console.error('Error fetching Google Sheet data:', error);
      
      toast({
        title: "Import failed",
        description: error.message || "Couldn't retrieve data from the Google Sheet.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createNewBoard = async (csvData: string) => {
    try {
      // First create a project
      const projectResponse = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName || 'Google Sheets Import',
          description: 'Created from Google Sheets import',
          status: 'active',
        }),
      });

      if (!projectResponse.ok) {
        throw new Error('Failed to create project');
      }

      const project = await projectResponse.json();

      // Then create a board with the CSV data
      const formData = new FormData();
      formData.append('csvData', csvData);
      formData.append('projectId', project.id.toString());
      formData.append('name', `${projectName || 'Google Sheets Import'} - Customer Journey`);

      const boardResponse = await fetch('/api/boards/import-csv', {
        method: 'POST',
        body: formData,
      });

      if (!boardResponse.ok) {
        throw new Error('Failed to create board from CSV data');
      }

      const board = await boardResponse.json();

      toast({
        title: "Import successful",
        description: "New board created from Google Sheet data",
        variant: "default"
      });

      if (onClose) onClose();
      navigate(`/boards/${board.id}`);
    } catch (error) {
      console.error('Error creating board from Google Sheet data:', error);
      
      toast({
        title: "Import failed",
        description: error.message || "Couldn't create a new board.",
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
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
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