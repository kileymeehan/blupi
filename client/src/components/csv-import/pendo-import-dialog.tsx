import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PendoCSVImport } from './pendo-csv-import';

interface PendoImportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PendoImportDialog({ isOpen, onOpenChange }: PendoImportDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import from Pendo</DialogTitle>
          <DialogDescription>
            Create a customer journey blueprint from Pendo funnel data
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <PendoCSVImport onClose={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}