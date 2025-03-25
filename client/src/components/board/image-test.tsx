import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ImageUpload from './image-upload';

export default function ImageTest() {
  const [image, setImage] = useState<string | null>(null);

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-lg font-semibold mb-4">Image Upload Test</h2>
      <ImageUpload 
        onImageChange={setImage}
        currentImage={image}
      />
      {image && (
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => setImage(null)}
        >
          Clear Image
        </Button>
      )}
    </div>
  );
}
