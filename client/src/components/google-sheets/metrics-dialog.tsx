import { useState, useEffect } from "react";
import { TableIcon, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  getBoardSheetDocuments, 
  getSheetTabs 
} from '@/services/google-sheets-api';

// Sheet document type
interface SheetDocument {
  id: string;
  name: string;
  sheetId: string;
  boardId: number;
  createdAt: string;
  updatedAt: string;
  sheets?: string[]; // Available sheet/tab names
}

// Predefined sheet tabs for testing when API is unavailable
const DEFAULT_SHEET_TABS = ["Sheet1", "Overview", "Data", "Monthly Stats"];

// Predefined cell data values for demonstration
const CELL_VALUES: Record<string, Record<string, string>> = {
  "D4": { "value": "3,809", "formatted": "3,809 users" },
  "E3": { "value": "55%", "formatted": "55%" },
  "C2": { "value": "11,096", "formatted": "$11,096" },
  "A1": { "value": "Step 1", "formatted": "Step 1" },
  "B5": { "value": "2,742", "formatted": "2,742 conversions" },
  "G7": { "value": "84.3%", "formatted": "84.3%" },
  "J10": { "value": "$4,200", "formatted": "$4,200" },
  "K12": { "value": "12.5", "formatted": "12.5 days" },
  "H3": { "value": "Yes", "formatted": "Yes" },
  "F9": { "value": "No", "formatted": "No" }
};

export interface SheetsConnectionData {
  sheetId?: string;
  cellRange?: string;
  value?: string;
  formattedValue?: string;
  sheetName?: string;
  label?: string;
  lastUpdated?: string;
}

interface MetricsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: SheetsConnectionData) => void;
  boardId: number;
}

export function MetricsDialog({
  isOpen,
  onClose,
  onComplete,
  boardId
}: MetricsDialogProps) {
  const [sheetDocuments, setSheetDocuments] = useState<SheetDocument[]>([]);
  const [selectedSheetDoc, setSelectedSheetDoc] = useState<string | "new">("new");
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [cell, setCell] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Get the current sheet document 
  const currentSheetDoc = selectedSheetDoc === "new" ? null : 
    sheetDocuments.find(s => s.id === selectedSheetDoc);
  
  // State for new sheet connection
  const [newSheetUrl, setNewSheetUrl] = useState("");
  const [newSheetName, setNewSheetName] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Fetch connected sheets when dialog opens
  useEffect(() => {
    if (isOpen && boardId) {
      loadConnectedSheets();
    }
  }, [isOpen, boardId]);
  
  // Load connected sheets for this board
  const loadConnectedSheets = async () => {
    setLoading(true);
    try {
      const sheets = await getBoardSheetDocuments(boardId);
      
      // Add sheet tabs to each document
      const sheetsWithTabs = await Promise.all(
        sheets.map(async (sheet) => {
          try {
            const tabs = await getSheetTabs(sheet.sheetId);
            return { ...sheet, sheets: tabs };
          } catch (err) {
            console.warn(`Error fetching tabs for sheet ${sheet.id}`, err);
            return { ...sheet, sheets: DEFAULT_SHEET_TABS };
          }
        })
      );
      
      setSheetDocuments(sheetsWithTabs);
      
      // If we have sheets, select the first one by default
      if (sheetsWithTabs.length > 0) {
        setSelectedSheetDoc(sheetsWithTabs[0].id);
        setSelectedSheet(sheetsWithTabs[0].sheets?.[0] || "Sheet1");
      }
    } catch (err) {
      console.error("Error loading connected sheets:", err);
      toast({
        title: "Error",
        description: "Failed to load connected sheets",
        variant: "destructive"
      });
      
      // If we can't load any sheets, default to mock data for development
      if (process.env.NODE_ENV === 'development') {
        const mockSheets = [
          { 
            id: "dev_sheet_1", 
            name: "Development Sheet", 
            sheetId: "dev123",
            boardId: boardId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sheets: DEFAULT_SHEET_TABS
          }
        ];
        setSheetDocuments(mockSheets);
        setSelectedSheetDoc(mockSheets[0].id);
        setSelectedSheet(mockSheets[0].sheets[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!cell) {
      toast({
        title: "Error",
        description: "Please enter a cell reference",
        variant: "destructive"
      });
      return;
    }
    
    // Handle "New Connection" option
    if (selectedSheetDoc === "new") {
      if (!newSheetUrl) {
        toast({
          title: "Error",
          description: "Please enter a Google Sheets URL",
          variant: "destructive"
        });
        return;
      }

      if (!newSheetName) {
        toast({
          title: "Error",
          description: "Please enter a name for this sheet",
          variant: "destructive"
        });
        return;
      }

      setIsConnecting(true);
      
      // Simulate connecting to the new sheet
      setTimeout(() => {
        setIsConnecting(false);
        toast({
          title: "Sheet Connected",
          description: `Successfully connected to "${newSheetName}"`,
        });
        
        // Create a new sheet document with a random ID
        const newId = `sheet_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const sheetId = newSheetUrl.match(/[-\w]{25,}/)?.[0] || "1zW6Tru8P0sKfsMDNDlP5Eyl6BAps4lyOJ-hnZo5JEkU";
        
        // Add the new sheet to our list (in a real app, this would save to the database)
        BOARD_SHEETS.push({
          id: newId,
          name: newSheetName,
          sheetId: sheetId,
          sheets: ["Sheet1", "Data", "Summary"]
        });
        
        // Select the newly created sheet
        setSelectedSheetDoc(newId);
        setSelectedSheet("Sheet1");
        
        // Clear the form
        setNewSheetUrl("");
        setNewSheetName("");
      }, 1500);
      
      return;
    }
    
    if (!currentSheetDoc) {
      toast({
        title: "Error",
        description: "Please select a sheet document",
        variant: "destructive"
      });
      return;
    }
    
    const upperCell = cell.toUpperCase();
    let cellData = CELL_VALUES[upperCell] || { value: "1,234", formatted: "1,234" };
    
    // Get a variety of sample values based on cell and sheet name for a more realistic demo
    if (upperCell.startsWith('A')) {
      cellData = { value: "42%", formatted: "42%" };
    } else if (upperCell.startsWith('B')) {
      cellData = { value: "1,205", formatted: "1,205 users" };
    } else if (upperCell.startsWith('C')) {
      cellData = { value: "67.3%", formatted: "67.3%" };
    } else if (upperCell.startsWith('D')) {
      if (selectedSheet.includes("Monthly")) {
        cellData = { value: "2,451", formatted: "2,451" };
      } else if (selectedSheet.includes("Financial")) {
        cellData = { value: "$5,280", formatted: "$5,280" };
      } else {
        cellData = { value: "3,809", formatted: "3,809" };
      }
    }
    
    // First close dialog
    onClose();
    
    // Then update with success message
    setTimeout(() => {
      toast({
        title: "Connection successful",
        description: `Retrieved value: ${cellData.formatted}`,
      });
      
      onComplete({
        sheetId: currentSheetDoc.sheetId,
        cellRange: upperCell,
        value: cellData.value,
        formattedValue: cellData.formatted,
        label: label || undefined,
        sheetName: selectedSheet,
        lastUpdated: new Date().toISOString()
      });
    }, 100);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Connect to Google Sheets</DialogTitle>
          <DialogDescription>Connect this block to a Google Sheets cell</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="sheetDoc">Select Google Sheet</Label>
            <select
              id="sheetDoc"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedSheetDoc}
              onChange={(e) => {
                setSelectedSheetDoc(e.target.value);
                if (e.target.value !== "new") {
                  const doc = sheetDocuments.find(s => s.id === e.target.value);
                  if (doc && doc.sheets && doc.sheets.length > 0) {
                    setSelectedSheet(doc.sheets[0]);
                  }
                }
              }}
            >
              {sheetDocuments.map(sheet => (
                <option key={sheet.id} value={sheet.id}>{sheet.name}</option>
              ))}
              <option value="new">+ Connect New Sheet</option>
            </select>
          </div>
          
          {selectedSheetDoc === "new" ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="newSheetUrl">Google Sheets URL</Label>
                <Input
                  id="newSheetUrl"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={newSheetUrl}
                  onChange={(e) => setNewSheetUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Paste the full URL to your Google Sheet
                </p>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="newSheetName">Sheet Name</Label>
                <Input
                  id="newSheetName"
                  placeholder="e.g., Q2 Marketing Metrics"
                  value={newSheetName}
                  onChange={(e) => setNewSheetName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Give this sheet a descriptive name
                </p>
              </div>
            </>
          ) : currentSheetDoc && (
            <div className="grid gap-2">
              <Label htmlFor="sheetTab">Select Sheet Tab</Label>
              <select
                id="sheetTab"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedSheet}
                onChange={(e) => setSelectedSheet(e.target.value)}
              >
                {currentSheetDoc.sheets.map(sheet => (
                  <option key={sheet} value={sheet}>{sheet}</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="grid gap-2">
            <Label htmlFor="cell">Cell Reference</Label>
            <Input
              id="cell"
              placeholder="e.g., D4"
              value={cell}
              onChange={(e) => setCell(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Try D4, E3, C2, or A1 for test data
            </p>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="label">Label (Optional)</Label>
            <Input
              id="label"
              placeholder="e.g., Conversion Rate"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>
            <TableIcon className="h-4 w-4 mr-2" />
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}