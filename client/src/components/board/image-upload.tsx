import { useState, useRef } from "react";
import { Image as ImageIcon, X, Upload, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  onImageChange: (image: string | null) => void;
  currentImage?: string | null;
}

export default function ImageUpload({
  onImageChange,
  currentImage,
}: ImageUploadProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;

            // Scale down more aggressively for larger images
            const maxDimension = 800; // Reduced from 1000px
            if (width > maxDimension || height > maxDimension) {
              const ratio = Math.min(maxDimension / width, maxDimension / height);
              width = Math.floor(width * ratio);
              height = Math.floor(height * ratio);
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error('Could not get canvas context'));
              return;
            }
            
            // Draw image with white background for transparency
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            // Updated compression parameters with increased limits
            const maxSizeInBytes = 250 * 1024; // 250KB limit as requested
            let quality = 0.8; // Start with higher quality
            let format = 'image/jpeg';
            
            // Try PNG for smaller images that might be graphics/icons
            if (file.size < 500 * 1024 && file.type.includes('png')) {
              format = 'image/png';
              quality = 0.85; // Higher quality for PNGs
            }
            
            let result = canvas.toDataURL(format, quality);
            
            // Progressive compression with smaller steps for better quality control
            let attempts = 0;
            while (result.length > maxSizeInBytes * 1.37 && quality > 0.2 && attempts < 15) {
              // Reduce quality more gradually
              quality -= (quality > 0.5) ? 0.05 : 0.02; 
              result = canvas.toDataURL('image/jpeg', quality);
              attempts++;
            }
            
            // If still too large, try a multi-step approach
            if (result.length > maxSizeInBytes * 1.37) {
              // First try a moderate dimension reduction
              const scaleFactor = 0.85;
              width = Math.floor(width * scaleFactor);
              height = Math.floor(height * scaleFactor);
              
              canvas.width = width;
              canvas.height = height;
              
              // Redraw with new dimensions
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0, width, height);
              
              quality = 0.7; // Reset quality to higher value with smaller dimensions
              result = canvas.toDataURL('image/jpeg', quality);
              
              // If still too big, try progressive compression again
              attempts = 0;
              while (result.length > maxSizeInBytes * 1.37 && quality > 0.2 && attempts < 10) {
                quality -= 0.05;
                result = canvas.toDataURL('image/jpeg', quality);
                attempts++;
              }
              
              // Last resort: further dimension reduction
              if (result.length > maxSizeInBytes * 1.37) {
                width = Math.floor(width * 0.8);
                height = Math.floor(height * 0.8);
                
                canvas.width = width;
                canvas.height = height;
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                
                quality = 0.6;
                result = canvas.toDataURL('image/jpeg', quality);
              }
            }

            console.log(`Compressed image from ${file.size} to ~${Math.round(result.length / 1.37)} bytes`);
            resolve(result);
          } catch (e) {
            reject(new Error(`Error processing image: ${e instanceof Error ? e.message : 'Unknown error'}`));
          }
        };
        img.onerror = () => {
          reject(new Error('Failed to process the image'));
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        reject(new Error('Failed to read the image file'));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    // Check file size before processing
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeInBytes) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUploading(true);
      const compressedImage = await compressImage(file);
      onImageChange(compressedImage);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to process the image. Please try a smaller image.",
        variant: "destructive"
      });
      onImageChange(null); // Reset the image state on failure
    } finally {
      setIsUploading(false);
    }
  };

  const handleClick = () => {
    if (currentImage) {
      setIsLightboxOpen(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageChange(null);
  };

  const handleReplace = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  return (
    <>
      <div
        onClick={handleClick}
        className="mb-2 h-40 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors cursor-pointer relative overflow-hidden w-full"
      >
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

        {currentImage ? (
          <>
            <img
              src={currentImage}
              alt="Uploaded"
              className="w-full h-40 object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-50 transition-opacity flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReplace}
                className="text-white hover:text-white hover:bg-transparent"
              >
                <Upload className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="text-white hover:text-white hover:bg-transparent"
              >
                <Trash className="w-4 h-4" />
              </Button>
            </div>
          </>
        ) : (
          <>
            {isUploading ? (
              <div className="animate-pulse">
                <Upload className="w-4 h-4 mb-1 animate-bounce" />
                <span className="text-xs">Uploading...</span>
              </div>
            ) : (
              <>
                <ImageIcon className="w-4 h-4 mb-1" />
                <span className="text-xs">Add image</span>
              </>
            )}
          </>
        )}
      </div>

      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-2 right-2 text-white bg-black bg-opacity-50 hover:bg-opacity-70"
            >
              <X className="w-4 h-4" />
            </Button>
            <img
              src={currentImage!}
              alt="Preview"
              className="w-full h-full object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}