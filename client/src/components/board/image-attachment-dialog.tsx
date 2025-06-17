import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImageIcon, X, Upload, Expand } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Attachment } from "@shared/schema";

interface ImageAttachmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentImages: Attachment[];
  onImagesChange: (images: Attachment[]) => void;
}

export function ImageAttachmentDialog({
  open,
  onOpenChange,
  currentImages,
  onImagesChange,
}: ImageAttachmentDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  console.log('[ImageDialog] Component rendered, open:', open);
  console.log('[ImageDialog] Current images:', currentImages);
  
  useEffect(() => {
    console.log('[ImageDialog] useEffect - currentImages changed:', currentImages);
  }, [currentImages]);

  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate compression ratio to stay under 250KB
        const MAX_SIZE = 250 * 1024; // 250KB in bytes
        let quality = 0.8;
        
        // Set canvas dimensions
        canvas.width = img.width;
        canvas.height = img.height;
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw and compress
        const compress = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob(
            (blob) => {
              if (blob && blob.size <= MAX_SIZE) {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              } else if (quality > 0.1) {
                quality -= 0.1;
                compress();
              } else {
                reject(new Error('Could not compress image under 250KB'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        
        compress();
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (file: File) => {
    console.log('[ImageDialog] handleImageUpload called with file:', file);
    
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      console.log('[ImageDialog] Starting image compression...');
      const compressedDataUrl = await compressImage(file);
      console.log('[ImageDialog] Image compressed successfully');
      
      // Create new attachment object
      const newAttachment: Attachment = {
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'image',
        url: compressedDataUrl,
        title: file.name,
      };

      console.log('[ImageDialog] Created new attachment:', newAttachment);
      
      // Add to current images
      const updatedImages = [...currentImages, newAttachment];
      console.log('[ImageDialog] Updated images array:', updatedImages);
      console.log('[ImageDialog] Calling onImagesChange callback...');
      
      // Call the callback to update parent state
      onImagesChange(updatedImages);
      console.log('[ImageDialog] Received onImagesChange callback');
      
      toast({
        title: "Image uploaded",
        description: `${file.name} has been uploaded successfully.`,
      });
    } catch (error) {
      console.error('[ImageDialog] Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (imageId: string) => {
    console.log('[ImageDialog] Removing image:', imageId);
    const updatedImages = currentImages.filter(img => img.id !== imageId);
    onImagesChange(updatedImages);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Images</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Upload Section - using exact same pattern as working ImageUpload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <ImageIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 mb-3">
                Upload images (max 250KB each)
              </p>
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="mb-2"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Choose Images'}
              </Button>
              
              {/* Hidden file input - exact same pattern */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImageUpload(file);
                  }
                }}
                accept="image/*"
                className="hidden"
              />
              
              <p className="text-xs text-gray-500">
                Supports JPG, PNG, GIF - Multiple files allowed
              </p>
            </div>

            {/* Current Images */}
            {currentImages.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Current Images ({currentImages.length})</h4>
                <div className="grid grid-cols-2 gap-3">
                  {currentImages.map((image) => (
                    <div key={image.id} className="relative group">
                      <img
                        src={image.url}
                        alt={image.title || 'Uploaded image'}
                        className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setExpandedImage(image.url)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedImage(image.url)}
                        className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white"
                      >
                        <Expand className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveImage(image.id)}
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-size Image Viewer Modal */}
      {expandedImage && (
        <Dialog open={true} onOpenChange={() => setExpandedImage(null)}>
          <DialogContent className="max-w-4xl w-full h-[80vh] p-2">
            <div className="relative w-full h-full flex items-center justify-center bg-black/5 rounded">
              <img
                src={expandedImage}
                alt="Full size view"
                className="max-w-full max-h-full object-contain"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedImage(null)}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}