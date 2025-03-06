import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link as LinkIcon, Image as ImageIcon, Video, FileText, X, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Board, Attachment } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { nanoid } from "nanoid";

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
  const [selectedTab, setSelectedTab] = useState('link');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Query project boards if we have a project ID
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newAttachment: Attachment = {
          id: nanoid(),
          type: 'image',
          url: reader.result as string,
          title: file.name
        };
        onAttach([...currentAttachments, newAttachment]);
        onOpenChange(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.add('border-primary');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove('border-primary');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newAttachment: Attachment = {
          id: nanoid(),
          type: 'image',
          url: reader.result as string,
          title: file.name
        };
        onAttach([...currentAttachments, newAttachment]);
        onOpenChange(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddAttachment = () => {
    if (!url) return;
    const newAttachment: Attachment = {
      id: nanoid(),
      type: selectedTab as 'link' | 'image' | 'video',
      url,
      title
    };
    onAttach([...currentAttachments, newAttachment]);
    setUrl('');
    setTitle('');
  };

  const handleRemoveAttachment = (id: string) => {
    onAttach(currentAttachments.filter(a => a.id !== id));
  };

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
                onClick={handleAddAttachment}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Link
              </Button>
            </TabsContent>

            <TabsContent value="image" className="space-y-4">
              <div
                ref={dropZoneRef}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors"
              >
                <ImageIcon className="w-8 h-8 mx-auto text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  Drag and drop an image here, or{" "}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-primary hover:underline"
                  >
                    browse
                  </button>
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </TabsContent>

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

      {/* Image expansion dialog */}
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