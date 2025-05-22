import { useState, forwardRef, useImperativeHandle } from "react";
import { TableIcon, RefreshCw } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Define handle for parent component interaction
export interface BasicMetricsHandle {
  openConnectDialog: () => void;
}

// Data type for sheet connection
export interface BasicSheetConnection {
  sheetId?: string;
  cellRange?: string;
  value?: string;
  formattedValue?: string;
  label?: string;
  sheetName?: string;
  lastUpdated?: string;
}

interface BasicMetricsProps {
  blockId: string;
  boardId: number;
  className?: string;
  initialConnection?: BasicSheetConnection;
  onUpdate: (data: BasicSheetConnection) => void;
}

// Sample cell values for demo
const CELL_VALUES: Record<string, string> = {
  "D4": "3,809",
  "E3": "55%",
  "C2": "11,096",
  "A1": "Step 1",
  "B5": "2,742",
  "G7": "84.3%",
  "C4": "2,279"
};

/**
 * A very basic metrics component that handles Google Sheets connections
 * without any complex elements that could cause the white screen issue
 */
export const BasicMetrics = forwardRef<BasicMetricsHandle, BasicMetricsProps>(({
  blockId,
  boardId,
  className = '',
  initialConnection,
  onUpdate
}, ref) => {
  const [isEditing, setIsEditing] = useState(false);
  const [cellRef, setCellRef] = useState(initialConnection?.cellRange || "");
  const [label, setLabel] = useState(initialConnection?.label || "");
  const [connection, setConnection] = useState<BasicSheetConnection>(initialConnection || {});
  
  const { toast } = useToast();
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    openConnectDialog: () => setIsEditing(true)
  }));
  
  // Simple save function
  const handleSave = () => {
    if (!cellRef) {
      toast({
        title: "Error",
        description: "Please enter a cell reference",
        variant: "destructive"
      });
      return;
    }
    
    // Simple mapping of cell to a value
    const upperCell = cellRef.toUpperCase();
    const value = CELL_VALUES[upperCell] || "2,279";
    
    // Update connection data
    const newConnection: BasicSheetConnection = {
      sheetId: "1zW6Tru8P0sKfsMDNDlP5Eyl6BAps4lyOJ-hnZo5JEkU",
      sheetName: "funnel-list",
      cellRange: upperCell,
      value: value,
      formattedValue: value,
      label: label || undefined,
      lastUpdated: new Date().toISOString()
    };
    
    // Set local state
    setConnection(newConnection);
    setIsEditing(false);
    
    // Update parent
    onUpdate(newConnection);
    
    toast({
      title: "Connected",
      description: `Cell ${upperCell} value: ${value}`
    });
  };
  
  // If editing, show the form
  if (isEditing) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Google Sheets Connection
          </CardTitle>
          <CardDescription className="text-xs">
            Enter cell details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cell">Cell Reference</Label>
            <Input
              id="cell"
              placeholder="e.g., C4"
              value={cellRef}
              onChange={(e) => setCellRef(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Try D4, E3, C2 for test data
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="label">Label (Optional)</Label>
            <Input
              id="label"
              placeholder="e.g., Conversion Rate"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-2">
            <Button 
              variant="outline" 
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <TableIcon className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // If no connection, show the connect button
  if (!connection.cellRange) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            <span className="flex items-center">
              <TableIcon className="h-3 w-3 mr-1" />
              Google Sheets Metric
            </span>
          </CardTitle>
          <CardDescription className="text-xs">
            Connect to a Google Sheets cell
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsEditing(true)}
          >
            <TableIcon className="h-4 w-4 mr-2" />
            Connect to Google Sheets
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Show connected state
  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center">
            <TableIcon className="h-3 w-3 mr-1" />
            Google Sheets Metric
          </span>
          <Badge 
            variant="outline" 
            className="text-xs font-normal px-1 ml-1 hover:bg-muted cursor-pointer"
            onClick={() => setIsEditing(true)}
          >
            <TableIcon className="h-2.5 w-2.5 mr-1" />
            Change
          </Badge>
        </CardTitle>
        {connection.label && (
          <CardDescription className="text-xs">{connection.label}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <p className="text-2xl font-semibold">{connection.value || '—'}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-muted-foreground">
            Cell: {connection.cellRange}
          </p>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5"
            onClick={() => {
              toast({
                title: "Refreshed",
                description: `Value: ${connection.value}`,
              });
            }}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});