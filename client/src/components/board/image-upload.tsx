import { useState, useRef } from 'react';
import { Image, X, Upload, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface ImageUploadProps {
  onImageChange: (image: string | null) => void;
  currentImage?: string | null;
}

export default function ImageUpload({ onImageChange, currentImage }: ImageUploadProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageChange(reader.result as string);
      };
      reader.readAsDataURL(file);
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
        className="mb-2 h-32 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors cursor-pointer relative overflow-hidden w-[205px]"
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
            <Image className="w-4 h-4 mb-2" />
            <span className="text-xs">Add image</span>
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