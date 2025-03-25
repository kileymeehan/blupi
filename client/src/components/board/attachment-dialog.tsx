// AttachmentDialog: Manages file attachments for blocks (images, links, board references)
import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link as LinkIcon, Image as ImageIcon, FileText, X, Plus, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Board, Attachment } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { nanoid } from "nanoid";
import { useToast } from "@/hooks/use-toast";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const { toast } = useToast();

  // Reset states when dialog closes
  useEffect(() => {
    if (!open) {
      setIsUploading(false);
      setUrl('');
      setTitle('');
    }
  }, [open]);

  // Simple image upload handler
  const handleImageUpload = (file: File) => {
    console.log('Starting image upload...', file.name);

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    console.log('Reading file...');

    const reader = new FileReader();

    reader.onload = function(e) {
      console.log('File read complete');
      try {
        if (!e.target?.result) {
          throw new Error('Failed to read file');
        }

        const newAttachment: Attachment = {
          id: nanoid(),
          type: 'image',
          url: e.target.result as string,
          title: file.name
        };

        console.log('Created attachment object');
        onAttach([...currentAttachments, newAttachment]);

        toast({
          title: "Success",
          description: "Image uploaded successfully"
        });

        setIsUploading(false);
        onOpenChange(false);
      } catch (error) {
        console.error('Error creating attachment:', error);
        toast({
          title: "Upload failed",
          description: "Failed to process image",
          variant: "destructive"
        });
        setIsUploading(false);
      }
    };

    reader.onerror = function(error) {
      console.error('FileReader error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to read image file",
        variant: "destructive"
      });
      setIsUploading(false);
    };

    try {
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error starting file read:', error);
      toast({
        title: "Upload failed",
        description: "Failed to start file upload",
        variant: "destructive"
      });
      setIsUploading(false);
    }
  };

  // File input change handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  // Link attachment handler
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

  // Remove attachment handler
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Attachments</DialogTitle>
          </DialogHeader>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
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

            {/* Link tab content */}
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

            {/* Image tab content */}
            <TabsContent value="image" className="space-y-4">
              <div className={`
                border-2 border-dashed rounded-lg p-6 
                text-center transition-all duration-200
                ${isUploading ? 'border-gray-300 bg-gray-50' : 'border-gray-300 hover:border-primary'}
              `}>
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="mt-2 text-sm text-gray-600">
                      Uploading image...
                    </p>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 mx-auto text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Click to upload an image
                    </p>
                    <input
                      type="file"
                      className="hidden"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileSelect}
                      disabled={isUploading}
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="mt-4"
                    >
                      Choose File
                    </Button>
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

          {/* Current attachments list */}
          {currentAttachments.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-sm font-medium mb-2">Current Attachments</h3>
              <div className="space-y-2">
                {currentAttachments.map(attachment => (
                  <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      {attachment.type === 'image' ? (
                        <button
                          onClick={() => setExpandedImage(attachment.url)}
                          className="w-8 h-8 rounded overflow-hidden"
                        >
                          <img
                            src={attachment.url}
                            alt={attachment.title || 'Attachment'}
                            className="w-full h-full object-cover"
                          />
                        </button>
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

      {/* Image preview dialog */}
      {expandedImage && (
        <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
          <DialogContent className="sm:max-w-[80vw] sm:max-h-[80vh]">
            <img
              src={expandedImage}
              alt="Expanded attachment"
              className="w-full h-full object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}