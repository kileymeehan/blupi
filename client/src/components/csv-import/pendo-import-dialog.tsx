import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PendoCSVImport } from './pendo-csv-import';
import { GoogleSheetsImport } from './google-sheets-import';
import { Upload, FileSpreadsheet } from 'lucide-react';

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
          <Tabs defaultValue="csv" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="csv" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                CSV Upload
              </TabsTrigger>
              <TabsTrigger value="sheets" className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Google Sheets
              </TabsTrigger>
            </TabsList>
            <TabsContent value="csv" className="pt-4">
              <PendoCSVImport onClose={() => onOpenChange(false)} />
            </TabsContent>
            <TabsContent value="sheets" className="pt-4">
              <GoogleSheetsImport onClose={() => onOpenChange(false)} />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}