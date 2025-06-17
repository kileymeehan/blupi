import { useState, useRef } from "react";
import { Image as ImageIcon, X, Upload, Trash, Wand2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";

interface ImageUploadProps {
  onImageChange: (image: string | null) => void;
  currentImage?: string | null;
  requireConfirmation?: boolean; // Only show confirmation dialog for image blocks
  boardId?: number;
  columnId?: string;
  onStoryboardGenerated?: (imageUrl: string | null, prompt: string) => void;
  storyboardPrompt?: string; // The prompt used for generating the storyboard
}

export default function ImageUpload({
  onImageChange,
  currentImage,
  requireConfirmation = false,
  boardId,
  columnId,
  onStoryboardGenerated,
  storyboardPrompt,
}: ImageUploadProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [showStoryboardPrompt, setShowStoryboardPrompt] = useState(false);
  const [storyboardPromptInput, setStoryboardPromptInput] = useState("");
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = () => {
          try {
            // If image is already under 250KB, just return it as-is
            if (file.size <= 250 * 1024) {
              console.log(`Image already under size limit (${file.size} bytes), skipping compression`);
              resolve(e.target?.result as string);
              return;
            }
            
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;

            // Scale down images based on size
            const maxDimension = 1000; // Increased from 800px
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
            let quality = 0.9; // Start with high quality
            let format = 'image/jpeg';
            
            // Try PNG for smaller images that might be graphics/icons
            if (file.size < 500 * 1024 && file.type.includes('png')) {
              format = 'image/png';
              quality = 0.9; // Higher quality for PNGs
            }
            
            let result = canvas.toDataURL(format, quality);
            
            // Only compress if over the limit
            if (result.length <= maxSizeInBytes * 1.37) {
              console.log(`Image already compressed to acceptable size: ~${Math.round(result.length / 1.37)} bytes`);
              resolve(result);
              return;
            }
            
            // Progressive compression with smaller steps for better quality control
            let attempts = 0;
            while (result.length > maxSizeInBytes * 1.37 && quality > 0.3 && attempts < 10) {
              // Reduce quality more gradually
              quality -= 0.1;
              result = canvas.toDataURL('image/jpeg', quality);
              attempts++;
            }
            
            // If still too large, try a multi-step approach
            if (result.length > maxSizeInBytes * 1.37) {
              // Moderate dimension reduction
              const scaleFactor = 0.9; // Less aggressive dimension reduction
              width = Math.floor(width * scaleFactor);
              height = Math.floor(height * scaleFactor);
              
              canvas.width = width;
              canvas.height = height;
              
              // Redraw with new dimensions
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0, width, height);
              
              quality = 0.8; // Reset quality to higher value with smaller dimensions
              result = canvas.toDataURL('image/jpeg', quality);
              
              // If still too big, try progressive compression again
              attempts = 0;
              while (result.length > maxSizeInBytes * 1.37 && quality > 0.3 && attempts < 5) {
                quality -= 0.1;
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
                
                quality = 0.7; // Higher minimum quality
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

    // Check file size before processing - increased from 5MB to 10MB
    const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeInBytes) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUploading(true);
      const compressedImage = await compressImage(file);
      onImageChange(compressedImage);
    } catch (error) {
      console.error("Image upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to process the image. If your image is already under 250KB, try a different format (JPG or PNG).",
        variant: "destructive"
      });
      onImageChange(null); // Reset the image state on failure
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateStoryboard = async () => {
    if (!boardId || !columnId || !storyboardPromptInput.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a prompt for the storyboard",
        variant: "destructive"
      });
      return;
    }

    try {
      // Close modal immediately after hitting generate
      setShowStoryboardPrompt(false);
      setIsGeneratingStoryboard(true);
      
      const response = await fetch(`/api/boards/${boardId}/columns/${columnId}/generate-storyboard`, {
        method: 'POST',
        body: JSON.stringify({ prompt: storyboardPromptInput.trim() }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success && data.imageUrl) {
        onImageChange(data.imageUrl);
        if (onStoryboardGenerated) {
          onStoryboardGenerated(data.imageUrl, storyboardPromptInput.trim());
        }
        setStoryboardPromptInput("");
        
        toast({
          title: "Storyboard generated",
          description: "AI storyboard image has been created successfully",
        });
      } else {
        throw new Error(data.message || 'Failed to generate storyboard');
      }
    } catch (error: any) {
      console.error("Storyboard generation error:", error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate storyboard image",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };

  const handleClick = () => {
    if (currentImage) {
      setIsLightboxOpen(true);
    } else {
      // Show options menu if both upload and storyboard are available
      if (boardId && columnId) {
        // Don't trigger menu here, let DropdownMenu handle it
        return;
      } else {
        fileInputRef.current?.click();
      }
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (requireConfirmation) {
      setShowDeleteConfirm(true);
    } else {
      onImageChange(null);
      // Also clear storyboard data if present
      if (onStoryboardGenerated) {
        onStoryboardGenerated(null, "");
      }
    }
  };

  const confirmDelete = () => {
    onImageChange(null);
    setShowDeleteConfirm(false);
  };

  const handleReplace = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const imageUploadContent = (
    <>
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
      ) : isGeneratingStoryboard ? (
        <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded">
          <Wand2 className="w-8 h-8 mb-2 animate-spin text-blue-500" />
          <span className="text-sm text-gray-600">Generating image...</span>
        </div>
      ) : isUploading ? (
        <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded">
          <Upload className="w-8 h-8 mb-2 animate-bounce text-blue-500" />
          <span className="text-sm text-gray-600">Uploading...</span>
        </div>
      ) : (
        <>
          <Plus className="w-4 h-4 mb-1" />
          <span className="text-xs">Add image</span>
        </>
      )}
    </>
  );

  // Render the main UI
  const mainUI = () => {
    // If storyboard generation is available and no image exists, use dropdown menu
    if (boardId && columnId && !currentImage) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div
              className={`mb-6 h-40 border-2 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer relative overflow-hidden w-full self-start border-dashed border-gray-200 hover:border-gray-300`}
            >
              {imageUploadContent}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" side="bottom" align="start">
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Image
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setShowStoryboardPrompt(true)}
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Generate Storyboard
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    // Otherwise, use regular click behavior
    return (
      <div
        onClick={handleClick}
        className={`mb-6 h-40 border-2 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer relative overflow-hidden w-full self-start ${
          currentImage 
            ? "border-solid border-gray-800" 
            : "border-dashed border-gray-200 hover:border-gray-300"
        }`}
      >
        {imageUploadContent}
      </div>
    );
  };

  return (
    <>
      {mainUI()}

      {/* Storyboard Prompt Dialog - Always rendered */}
      <Dialog open={showStoryboardPrompt} onOpenChange={setShowStoryboardPrompt}>
        <DialogContent className="sm:max-w-md">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Generate AI Storyboard</h3>
              <p className="text-sm text-gray-600">
                Describe the scene you want to visualize for this step
              </p>
            </div>
            <Input
              placeholder="e.g., A tired small business owner organizing receipts late at night"
              value={storyboardPromptInput}
              onChange={(e) => setStoryboardPromptInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isGeneratingStoryboard) {
                  handleGenerateStoryboard();
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowStoryboardPrompt(false);
                  setStoryboardPromptInput("");
                }}
                disabled={isGeneratingStoryboard}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateStoryboard}
                disabled={!storyboardPromptInput.trim() || isGeneratingStoryboard}
              >
                {isGeneratingStoryboard ? (
                  <>
                    <Wand2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden">
          <div className="relative flex items-center justify-center bg-black">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-4 right-4 z-10 text-white bg-black bg-opacity-50 hover:bg-opacity-70"
            >
              <X className="w-4 h-4" />
            </Button>
            <div className="flex flex-col items-center">
              <img
                src={currentImage!}
                alt="Preview"
                className="max-w-full max-h-[80vh] object-contain"
                style={{
                  minWidth: '300px',
                  minHeight: '300px',
                }}
              />
              {storyboardPrompt && storyboardPrompt.trim() && (
                <div className="mt-4 p-3 bg-gray-100 rounded-lg max-w-lg text-center">
                  <p className="text-sm text-gray-600 font-medium mb-1">AI Prompt Used:</p>
                  <p className="text-sm text-gray-800">"{storyboardPrompt}"</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {requireConfirmation && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Image</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this image? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}