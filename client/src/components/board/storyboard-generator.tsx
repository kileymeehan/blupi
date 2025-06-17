import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Palette, X } from 'lucide-react';
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

  // Show existing storyboard image if available
  if (column.storyboardImageUrl && !showGenerator) {
    return (
      <div className="mb-3">
        <div className="relative group">
          <img
            src={column.storyboardImageUrl}
            alt={column.storyboardPrompt || 'Storyboard'}
            className="w-full h-32 object-cover rounded-lg border border-gray-200"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setPrompt(column.storyboardPrompt || '');
                  setShowGenerator(true);
                }}
                className="bg-white/90 hover:bg-white text-gray-900"
              >
                <Palette className="w-3 h-3 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleClearStoryboard}
                className="bg-red-600/90 hover:bg-red-600"
              >
                <X className="w-3 h-3 mr-1" />
                Remove
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