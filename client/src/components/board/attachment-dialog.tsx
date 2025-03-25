import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { nanoid } from "nanoid";
import type { Attachment } from "@shared/schema";
import ImageUpload from "./image-upload";

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
  const { toast } = useToast();

  const handleImageChange = (imageData: string | null) => {
    if (!imageData) return;

    try {
      const newAttachment: Attachment = {
        id: nanoid(),
        type: 'image',
        url: imageData,
        title: 'Uploaded image'
      };

      onAttach([...currentAttachments, newAttachment]);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create attachment:', error);
      toast({
        title: "Error",
        description: "Failed to add image attachment",
        variant: "destructive"
      });
    }
  };

  const handleRemoveAttachment = (id: string) => {
    onAttach(currentAttachments.filter(a => a.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Image</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <ImageUpload onImageChange={handleImageChange} />

          {currentAttachments.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-sm font-medium mb-2">Current Attachments</h3>
              <div className="space-y-2">
                {currentAttachments.map(attachment => (
                  <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded overflow-hidden">
                        <img
                          src={attachment.url}
                          alt={attachment.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-sm truncate">
                        {attachment.title}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAttachment(attachment.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}