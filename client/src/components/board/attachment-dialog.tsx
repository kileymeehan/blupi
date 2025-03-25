import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { nanoid } from "nanoid";
import type { Attachment } from "@shared/schema";

interface AttachmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAttachments?: Attachment[];
  onAttach: (attachments: Attachment[]) => void;
}

export function AttachmentDialog({
  open,
  onOpenChange,
  currentAttachments = [],
  onAttach
}: AttachmentDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // 100KB limit for testing
    if (file.size > 100 * 1024) {
      toast({
        title: "Error",
        description: "Image must be smaller than 100KB for testing",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Read file as base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Failed to read file'));
          }
        };
        reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      // Create new attachment
      const newAttachment: Attachment = {
        id: nanoid(),
        type: 'image',
        url: base64Data,
        title: file.name
      };

      // Update attachments
      onAttach([...currentAttachments, newAttachment]);

      // Clear input and close dialog
      event.target.value = '';
      onOpenChange(false);

      toast({
        title: "Success",
        description: "Image uploaded successfully"
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to process image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Image</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center p-6">
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-gray-600">Processing image...</p>
            </div>
          ) : (
            <>
              <ImageIcon className="w-8 h-8 text-gray-400 mb-4" />
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
                <Button variant="outline" type="button">
                  Select Image
                </Button>
              </label>
              <p className="mt-2 text-xs text-gray-500">
                Maximum size: 100KB (testing)
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}