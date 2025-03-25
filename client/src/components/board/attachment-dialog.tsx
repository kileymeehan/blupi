import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon } from "lucide-react";
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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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

    if (file.size > 1024 * 1024) { // 1MB limit
      toast({
        title: "Error",
        description: "Image must be smaller than 1MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = function() {
      if (typeof reader.result !== 'string') {
        toast({
          title: "Error",
          description: "Failed to read image",
          variant: "destructive"
        });
        setIsUploading(false);
        return;
      }

      const newAttachment: Attachment = {
        id: nanoid(),
        type: 'image',
        url: reader.result,
        title: file.name
      };

      onAttach([...currentAttachments, newAttachment]);
      setIsUploading(false);
      onOpenChange(false);

      toast({
        title: "Success",
        description: "Image uploaded successfully"
      });
    };

    reader.onerror = function() {
      toast({
        title: "Error",
        description: "Failed to read image",
        variant: "destructive"
      });
      setIsUploading(false);
    };

    try {
      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process image",
        variant: "destructive"
      });
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
            <p className="text-sm text-gray-600">Uploading...</p>
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
                Maximum size: 1MB
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}