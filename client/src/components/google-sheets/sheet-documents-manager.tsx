import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Edit, 
  Trash2, 
  FileSpreadsheet, 
  RefreshCw, 
} from 'lucide-react';
import { 
  getBoardSheetDocuments, 
  createSheetDocument, 
  updateSheetDocument, 
  deleteSheetDocument 
} from '@/services/google-sheets-api';

interface SheetDocument {
  id: string;
  boardId: number;
  name: string;
  sheetId: string;
  createdAt: string;
  updatedAt: string;
}

interface SheetDocumentsManagerProps {
  boardId: number;
  className?: string;
}

export function SheetDocumentsManager({ boardId, className = '' }: SheetDocumentsManagerProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<SheetDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<SheetDocument | null>(null);
  
  // Form states
  const [newDocName, setNewDocName] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [editDocName, setEditDocName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load sheet documents
  const loadDocuments = async () => {
    if (!boardId) return;
    
    setLoading(true);
    try {
      const docs = await getBoardSheetDocuments(boardId);
      setDocuments(docs);
    } catch (err) {
      console.error('Error loading sheet documents:', err);
      toast({
        title: 'Error',
        description: 'Failed to load Google Sheets documents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [boardId]);

  // Handle adding a new document
  const handleAddDocument = async () => {
    if (!newDocName || !newDocUrl) {
      setError('Name and Google Sheets URL are required');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      console.log('Connecting new Google Sheet with name:', newDocName, 'and URL:', newDocUrl);
      
      // Attempt to extract the Sheet ID to validate the URL format
      if (newDocUrl.indexOf('docs.google.com/spreadsheets/d/') === -1 && !newDocUrl.startsWith('csv:')) {
        throw new Error('Invalid Google Sheets URL format. Please provide a valid URL in the format: https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/...');
      }
      
      // Call the API to create the document
      await createSheetDocument(boardId, newDocName, newDocUrl);
      
      // Success - close dialog and refresh list
      setShowAddDialog(false);
      setNewDocName('');
      setNewDocUrl('');
      
      toast({
        title: 'Success',
        description: 'Google Sheet has been connected successfully',
      });
      
      loadDocuments();
    } catch (err) {
      console.error('Error adding sheet document:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect Google Sheet';
      setError(errorMessage);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle editing a document
  const handleEditDocument = async () => {
    if (!selectedDocument || !editDocName) {
      setError('Name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      await updateSheetDocument(boardId, selectedDocument.id, editDocName);
      
      // Success - close dialog and refresh list
      setShowEditDialog(false);
      setSelectedDocument(null);
      setEditDocName('');
      
      toast({
        title: 'Success',
        description: 'Google Sheet connection has been updated',
      });
      
      loadDocuments();
    } catch (err) {
      console.error('Error updating sheet document:', err);
      setError(err instanceof Error ? err.message : 'Failed to update Google Sheet connection');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deleting a document
  const handleDeleteDocument = async () => {
    if (!selectedDocument) return;

    setIsSubmitting(true);
    
    try {
      await deleteSheetDocument(boardId, selectedDocument.id);
      
      // Success - close dialog and refresh list
      setShowDeleteDialog(false);
      setSelectedDocument(null);
      
      toast({
        title: 'Success',
        description: 'Google Sheet connection has been removed',
      });
      
      loadDocuments();
    } catch (err) {
      console.error('Error deleting sheet document:', err);
      toast({
        title: 'Error',
        description: 'Failed to remove Google Sheet connection',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open edit dialog with the selected document
  const openEditDialog = (doc: SheetDocument) => {
    setSelectedDocument(doc);
    setEditDocName(doc.name);
    setShowEditDialog(true);
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (doc: SheetDocument) => {
    setSelectedDocument(doc);
    setShowDeleteDialog(true);
  };

  // Format URL for display
  const formatSheetUrl = (sheetId: string) => {
    return `https://docs.google.com/spreadsheets/d/${sheetId}`;
  };

  return (
    <div className={`google-sheets-manager ${className}`}>
      <h3 className="text-base font-medium mb-3 w-full text-left">Connected Google Sheets</h3>
      
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Button
          size="sm"
          variant="outline"
          onClick={loadDocuments}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Sheet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Google Sheet</DialogTitle>
              <DialogDescription>
                Add a Google Sheet to use with metrics blocks
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="sheet-name">Name</Label>
                <Input
                  id="sheet-name"
                  placeholder="My Metrics Sheet"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  A friendly name to identify this sheet
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sheet-url">Google Sheets URL</Label>
                <Input
                  id="sheet-url"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={newDocUrl}
                  onChange={(e) => setNewDocUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The URL of your Google Sheet. Make sure it's publicly accessible or shared with the right permissions.
                </p>
              </div>
              
              {error && (
                <div className="bg-destructive/20 p-3 rounded-md text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowAddDialog(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddDocument}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>Connect Sheet</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="border rounded-md">
        {documents.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            {loading ? (
              <div className="flex flex-col items-center space-y-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <p>Loading sheets...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <FileSpreadsheet className="h-8 w-8" />
                <p>No Google Sheets connected yet</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAddDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Connect a sheet
                </Button>
              </div>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[250px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Connected Sheets</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id} className="bg-white">
                    <TableCell className="font-medium">
                      <a 
                        href={formatSheetUrl(doc.sheetId)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline flex items-center"
                      >
                        <FileSpreadsheet className="h-3 w-3 mr-1" />
                        {doc.name}
                      </a>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(doc)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(doc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Google Sheet Connection</DialogTitle>
            <DialogDescription>
              Update the name of this Google Sheet connection
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-sheet-name">Name</Label>
              <Input
                id="edit-sheet-name"
                value={editDocName}
                onChange={(e) => setEditDocName(e.target.value)}
              />
            </div>
            
            {error && (
              <div className="bg-destructive/20 p-3 rounded-md text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowEditDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEditDocument}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>Save Changes</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Google Sheet Connection</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this Google Sheet connection?
              This will not affect any existing metric blocks that use this sheet.
            </DialogDescription>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="py-2 space-y-2">
              <div className="p-3 border rounded-md">
                <p className="font-medium">{selectedDocument.name}</p>
                <p className="text-sm text-muted-foreground">
                  Sheet ID: {selectedDocument.sheetId}
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteDocument}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                <>Remove Connection</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}