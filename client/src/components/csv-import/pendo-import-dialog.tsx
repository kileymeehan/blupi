import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PendoCSVImport } from './pendo-csv-import';
import { Upload } from 'lucide-react';

interface PendoImportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PendoImportDialog({ isOpen, onOpenChange }: PendoImportDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Data</DialogTitle>
          <DialogDescription>
            Create a customer journey blueprint from Pendo funnel data
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <div className="flex items-center gap-2 text-sm font-medium mb-4">
            <Upload className="h-4 w-4" />
            CSV Upload
          </div>
          <PendoCSVImport onClose={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}