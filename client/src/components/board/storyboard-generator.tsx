import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Palette, X, ZoomIn, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Column } from '@shared/schema';

interface StoryboardGeneratorProps {
  column: Column;
  boardId: number;
  phaseIndex: number;
  columnIndex: number;
  onStoryboardGenerated: (imageUrl: string, prompt: string) => void;
}

export function StoryboardGenerator({
  column,
  boardId,
  phaseIndex,
  columnIndex,
  onStoryboardGenerated
}: StoryboardGeneratorProps) {
  const [prompt, setPrompt] = useState(column.storyboardPrompt || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const { toast } = useToast();

  const handleGenerateStoryboard = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a description for the storyboard image.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      console.log('Generating storyboard for column:', column.id, 'prompt:', prompt);
      
      const response = await fetch(`/api/boards/${boardId}/columns/${column.id}/generate-storyboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate storyboard');
      }

      const result = await response.json();
      
      console.log('[STORYBOARD UI] === GENERATION SUCCESS ===');
      console.log('[STORYBOARD UI] API Response:', result);
      console.log('[STORYBOARD UI] Image URL:', result.imageUrl);
      console.log('[STORYBOARD UI] Prompt:', result.prompt);
      console.log('[STORYBOARD UI] Column ID:', result.columnId);
      
      // Validate image URL accessibility
      if (result.imageUrl) {
        console.log('[STORYBOARD UI] Testing image URL accessibility...');
        const img = new Image();
        img.onload = () => console.log('[STORYBOARD UI] ✓ Image URL is accessible');
        img.onerror = (err) => console.error('[STORYBOARD UI] ✗ Image URL failed to load:', err);
        img.src = result.imageUrl;
      }
      
      // Update the local state and notify parent
      console.log('[STORYBOARD UI] Calling onStoryboardGenerated with:', result.imageUrl, prompt.trim());
      onStoryboardGenerated(result.imageUrl, prompt.trim());
      
      toast({
        title: "Storyboard generated",
        description: "AI storyboard image has been created successfully!",
      });

      setShowGenerator(false);

    } catch (error: any) {
      console.error('Storyboard generation error:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate storyboard image",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearStoryboard = () => {
    onStoryboardGenerated('', '');
    setPrompt('');
    setShowGenerator(false);
    
    toast({
      title: "Storyboard cleared",
      description: "Storyboard has been removed from this column.",
    });
  };

  const handleDownloadImage = async () => {
    if (!column.storyboardImageUrl) return;
    
    try {
      const response = await fetch(column.storyboardImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `storyboard-${column.name || 'image'}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Image downloaded",
        description: "Storyboard image has been saved to your downloads.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download the image.",
        variant: "destructive",
      });
    }
  };

  // Show existing storyboard image if available
  if (column.storyboardImageUrl && !showGenerator) {
    return (
      <>
        <div className="mb-3">
          <div className="relative group">
            <img
              src={column.storyboardImageUrl}
              alt={column.storyboardPrompt || 'Storyboard'}
              className="w-full h-40 object-cover rounded-lg border border-gray-200 cursor-pointer"
              onClick={() => setShowImageModal(true)}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex flex-col gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowImageModal(true)}
                  className="bg-white/90 hover:bg-white text-gray-900 h-6 px-1.5 text-xs min-w-0"
                >
                  <ZoomIn className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setPrompt(column.storyboardPrompt || '');
                    setShowGenerator(true);
                  }}
                  className="bg-white/90 hover:bg-white text-gray-900 h-6 px-1.5 text-xs min-w-0"
                >
                  <Palette className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleClearStoryboard}
                  className="bg-red-600/90 hover:bg-red-600 h-6 px-1.5 text-xs min-w-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
          {column.storyboardPrompt && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              "{column.storyboardPrompt}"
            </p>
          )}
        </div>

        {/* Image Zoom Modal */}
        <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <DialogHeader className="p-6 pb-4">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-semibold">
                  Storyboard Image
                </DialogTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadImage}
                  className="ml-2"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
              {column.storyboardPrompt && (
                <p className="text-sm text-gray-600 mt-2">
                  "{column.storyboardPrompt}"
                </p>
              )}
            </DialogHeader>
            <div className="px-6 pb-6">
              <img
                src={column.storyboardImageUrl}
                alt={column.storyboardPrompt || 'Storyboard'}
                className="w-full h-auto rounded-lg border border-gray-200"
                style={{ maxHeight: 'calc(90vh - 200px)' }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Show generator interface
  if (showGenerator) {
    return (
      <Card className="mb-3">
        <CardContent className="p-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Generate Storyboard</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGenerator(false)}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            
            <div>
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A tired small business owner organizing receipts late at night"
                className="text-xs"
                disabled={isGenerating}
              />
              <p className="text-xs text-gray-500 mt-1">
                Describe the scene for this step in the journey
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleGenerateStoryboard}
                disabled={!prompt.trim() || isGenerating}
                className="flex-1 text-xs"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Palette className="w-3 h-3 mr-1" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show button to open generator
  return (
    <div className="mb-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowGenerator(true)}
        className="w-full text-xs border-dashed border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-800"
      >
        <Palette className="w-3 h-3 mr-1" />
        Add Storyboard
      </Button>
    </div>
  );
}