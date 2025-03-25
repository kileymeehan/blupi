import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Image } from 'lucide-react';

interface ImageUploadProps {
  onImageChange: (image: string | null) => void;
  currentImage?: string | null;
}

export default function ImageUpload({ onImageChange, currentImage }: ImageUploadProps) {
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


    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onImageChange(reader.result);
        }
        setIsUploading(false);
      };

      reader.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to read image",
          variant: "destructive"
        });
        setIsUploading(false);
      };
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
    <div className="mb-2 h-24 border-2 border-dashed border-gray-200 rounded-lg">
      <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
        <input
          type="file"
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />

        {isUploading ? (
          <div className="text-center">
            <p className="text-sm text-gray-600">Uploading...</p>
          </div>
        ) : currentImage ? (
          <img 
            src={currentImage} 
            alt="Preview" 
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <div className="text-center">
            <Image className="w-6 h-6 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600">Click to upload</p>
          </div>
        )}
      </label>
    </div>
  );
}