import { useState, useRef } from "react";
import { Image, X, Upload, Trash } from "lucide-react";
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
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // If image is larger than 2000px in any dimension, scale it down
          const maxDimension = 2000;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          // Use lower quality for larger files
          const quality = file.size > 1024 * 1024 ? 0.7 : 0.9;
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const compressedImage = await compressImage(file);
      onImageChange(compressedImage);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to process the image. Please try again.",
        variant: "destructive",
      });
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
        className="mb-2 h-24 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors cursor-pointer relative overflow-hidden w-[225px]"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />

        {currentImage ? (
          <>
            <img
              src={currentImage}
              alt="Uploaded"
              className="w-full h-full object-cover"
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
                <Image className="w-4 h-4 mb-1" />
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
