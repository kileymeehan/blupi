// Simple attachment dialog component
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link as LinkIcon, Image as ImageIcon, FileText, X, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { nanoid } from "nanoid";
import type { Attachment } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { Board } from "@shared/schema";


interface AttachmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: number;
  currentAttachments?: Attachment[];
  onAttach: (attachments: Attachment[]) => void;
}

export function AttachmentDialog({
  open,
  onOpenChange,
  projectId,
  currentAttachments = [],
  onAttach
}: AttachmentDialogProps) {
  // Basic state
  const [selectedTab, setSelectedTab] = useState('link');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // Handle image upload
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 2MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    // Simple FileReader implementation
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = () => {
      try {
        // Create attachment
        const newAttachment: Attachment = {
          id: nanoid(),
          type: 'image',
          url: reader.result as string,
          title: file.name
        };

        // Update attachments
        onAttach([...currentAttachments, newAttachment]);

        // Reset state
        setIsUploading(false);
        event.target.value = '';

        // Close dialog
        onOpenChange(false);

        toast({
          title: "Success",
          description: "Image uploaded successfully"
        });
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: "Upload failed",
          description: "Failed to process image",
          variant: "destructive"
        });
        setIsUploading(false);
        event.target.value = '';
      }
    };

    reader.onerror = () => {
      console.error('FileReader error:', reader.error);
      toast({
        title: "Upload failed",
        description: "Failed to read image file",
        variant: "destructive"
      });
      setIsUploading(false);
      event.target.value = '';
    };
  };

  // Handle link attachment
  const handleAddLink = () => {
    if (!url) return;

    const newAttachment: Attachment = {
      id: nanoid(),
      type: 'link',
      url,
      title: title || url
    };

    onAttach([...currentAttachments, newAttachment]);
    setUrl('');
    setTitle('');
  };

  // Handle attachment removal
  const handleRemoveAttachment = (id: string) => {
    onAttach(currentAttachments.filter(a => a.id !== id));
  };

  // Fetch project boards for linking
  const { data: projectBoards } = useQuery<Board[]>({
    queryKey: ['/api/projects', projectId, 'boards'],
    queryFn: async () => {
      if (!projectId) return [];
      const res = await fetch(`/api/projects/${projectId}/boards`);
      if (!res.ok) throw new Error('Failed to fetch project boards');
      return res.json();
    },
    enabled: !!projectId
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Attachment</DialogTitle>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">
              <LinkIcon className="w-4 h-4 mr-2" />
              Link
            </TabsTrigger>
            <TabsTrigger value="image">
              <ImageIcon className="w-4 h-4 mr-2" />
              Image
            </TabsTrigger>
            <TabsTrigger value="board">
              <FileText className="w-4 h-4 mr-2" />
              Board
            </TabsTrigger>
          </TabsList>

          {/* Link tab */}
          <TabsContent value="link" className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Enter URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <Input
                placeholder="Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleAddLink}
              disabled={!url}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Link
            </Button>
          </TabsContent>

          {/* Image tab */}
          <TabsContent value="image" className="space-y-4">
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg">
              {isUploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="mt-2 text-sm text-gray-600">Uploading image...</p>
                </div>
              ) : (
                <>
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">Select an image to upload</p>
                  <label className="mt-4">
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageSelect}
                      disabled={isUploading}
                    />
                    <Button variant="outline" type="button">
                      Choose File
                    </Button>
                  </label>
                </>
              )}
            </div>
          </TabsContent>

          {/* Board tab content */}
          <TabsContent value="board" className="space-y-4">
            <ScrollArea className="h-[200px] rounded-md border p-2">
              {projectBoards?.map(board => (
                <Card
                  key={board.id}
                  className="mb-2 cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    const newAttachment: Attachment = {
                      id: nanoid(),
                      type: 'link',
                      url: `/board/${board.id}`,
                      title: board.name
                    };
                    onAttach([...currentAttachments, newAttachment]);
                    onOpenChange(false);
                  }}
                >
                  <CardContent className="p-3">
                    <div className="text-sm font-medium">{board.name}</div>
                    {board.description && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {board.description}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {(!projectBoards || projectBoards.length === 0) && (
                <div className="text-sm text-gray-500 text-center py-4">
                  No other boards found in this project
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Current attachments */}
        {currentAttachments.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h3 className="text-sm font-medium mb-2">Current Attachments</h3>
            <div className="space-y-2">
              {currentAttachments.map(attachment => (
                <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    {attachment.type === 'image' ? (
                      <div className="w-8 h-8 rounded overflow-hidden">
                        <img
                          src={attachment.url}
                          alt={attachment.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <LinkIcon className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="text-sm truncate">
                      {attachment.title || attachment.url}
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
      </DialogContent>
    </Dialog>
  );
}