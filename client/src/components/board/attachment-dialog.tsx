import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  // Ensure currentAttachments is always an array and remove duplicates
  const safeCurrentAttachments = (() => {
    if (!Array.isArray(currentAttachments)) {
      console.log('[AttachmentDialog] currentAttachments is not an array:', typeof currentAttachments, currentAttachments);
      return [];
    }
    
    // Remove duplicates based on URL and ensure all attachments have required fields
    const validAttachments = currentAttachments.filter(att => 
      att && typeof att === 'object' && att.url && att.type && att.id
    );
    
    const uniqueAttachments = validAttachments.reduce((acc, current) => {
      const existing = acc.find(item => item.url === current.url);
      if (!existing) {
        acc.push(current);
      }
      return acc;
    }, [] as Attachment[]);
    
    console.log('[AttachmentDialog] Processed attachments:', uniqueAttachments);
    return uniqueAttachments;
  })();
  const [selectedTab, setSelectedTab] = useState('link');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const validateAndProcessImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('Please upload an image file'));
        return;
      }
      
      // Check file size limit (250KB = 250 * 1024 bytes)
      const maxSizeInBytes = 250 * 1024;
      if (file.size > maxSizeInBytes) {
        reject(new Error('Image file is too large. Please upload an image smaller than 250KB or compress it first.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = () => {
        reject(new Error('Failed to read the image file'));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (file: File) => {
    try {
      console.log('[AttachmentDialog] Starting image upload for file:', file.name, 'size:', file.size);
      setIsUploading(true);
      const imageDataUrl = await validateAndProcessImage(file);
      console.log('[AttachmentDialog] Image processed successfully, data URL length:', imageDataUrl.length);

      const newAttachment: Attachment = {
        id: nanoid(),
        type: 'image',
        url: imageDataUrl,
        title: file.name
      };

      console.log('[AttachmentDialog] Created new attachment:', newAttachment);
      console.log('[AttachmentDialog] Current safe attachments:', safeCurrentAttachments);
      
      const updatedAttachments = [...safeCurrentAttachments, newAttachment];
      console.log('[AttachmentDialog] Updated attachments array length:', updatedAttachments.length);
      console.log('[AttachmentDialog] About to call onAttach with attachments:', updatedAttachments);
      
      onAttach(updatedAttachments);
      console.log('[AttachmentDialog] onAttach called successfully');
      
      // Don't close immediately to allow debugging
      setTimeout(() => {
        console.log('[AttachmentDialog] Closing dialog after successful upload');
        onOpenChange(false);
      }, 1000);
      
    } catch (error) {
      console.error('[AttachmentDialog] Image upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to process the image",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageUpload(file);
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
    console.log('[AttachmentDialog] File input change event triggered');
    const file = e.target.files?.[0];
    console.log('[AttachmentDialog] Selected file:', file ? file.name : 'No file');
    console.log('[AttachmentDialog] File details:', file ? {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    } : 'None');
    
    if (file) {
      console.log('[AttachmentDialog] Calling handleImageUpload for file:', file.name);
      handleImageUpload(file);
    } else {
      console.log('[AttachmentDialog] No file selected, upload cancelled');
    }
  };

  const handleAddLink = () => {
    if (!url) return;
    const newAttachment: Attachment = {
      id: nanoid(),
      type: 'link',
      url,
      title: title || url
    };
    onAttach([...safeCurrentAttachments, newAttachment]);
    setUrl('');
    setTitle('');
  };

  const handleRemoveAttachment = (id: string) => {
    onAttach(safeCurrentAttachments.filter(a => a.id !== id));
  };

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
            <DialogTitle className="text-[#302E87] text-xl font-semibold">Attachments</DialogTitle>
          </DialogHeader>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-3 bg-[#FFE8D6]/20">
              <TabsTrigger value="link" className="data-[state=active]:bg-[#302E87] data-[state=active]:text-white">
                <LinkIcon className="w-4 h-4 mr-2" />
                Link
              </TabsTrigger>
              <TabsTrigger value="image" className="data-[state=active]:bg-[#302E87] data-[state=active]:text-white">
                <ImageIcon className="w-4 h-4 mr-2" />
                Image
              </TabsTrigger>
              <TabsTrigger value="board" className="data-[state=active]:bg-[#302E87] data-[state=active]:text-white">
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
                  className="border-[#A1D9F5] focus-visible:ring-[#302E87]/30 placeholder:text-[#6B6B97]/50"
                />
                <Input
                  placeholder="Title (optional)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-[#A1D9F5] focus-visible:ring-[#302E87]/30 placeholder:text-[#6B6B97]/50"
                />
              </div>
              <Button
                className="w-full bg-[#302E87] hover:bg-[#252270] text-white"
                onClick={handleAddLink}
                disabled={!url}
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
                className={`
                  border-2 border-dashed border-[#A1D9F5] rounded-lg p-6 
                  text-center hover:border-[#302E87] transition-colors
                  ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#302E87]" />
                    <p className="mt-2 text-sm text-[#6B6B97]">
                      Uploading image...
                    </p>
                  </div>
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 mx-auto text-[#A1D9F5]" />
                    <p className="mt-2 text-sm text-[#6B6B97]">
                      Drag and drop an image here (max 250KB), or{" "}
                      <button
                        onClick={() => {
                          console.log('[AttachmentDialog] Browse button clicked');
                          console.log('[AttachmentDialog] fileInputRef.current:', fileInputRef.current);
                          fileInputRef.current?.click();
                        }}
                        className="text-[#302E87] hover:underline font-medium"
                        disabled={isUploading}
                      >
                        browse
                      </button>
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
              </div>
            </TabsContent>

            <TabsContent value="board" className="space-y-4">
              <ScrollArea className="h-[200px] rounded-md border border-[#A1D9F5] p-2">
                {projectBoards?.map(board => (
                  <Card
                    key={board.id}
                    className="mb-2 cursor-pointer hover:bg-[#FFE8D6]/20 transition-colors"
                    onClick={() => {
                      const newAttachment: Attachment = {
                        id: nanoid(),
                        type: 'link',
                        url: `/board/${board.id}`,
                        title: board.name
                      };
                      onAttach([...safeCurrentAttachments, newAttachment]);
                      onOpenChange(false);
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="text-sm font-medium text-[#302E87]">{board.name}</div>
                      {board.description && (
                        <div className="text-xs text-[#6B6B97] mt-1 line-clamp-2">
                          {board.description}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {(!projectBoards || projectBoards.length === 0) && (
                  <div className="text-sm text-[#6B6B97] text-center py-4">
                    No other boards found in this project
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {safeCurrentAttachments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#A1D9F5]/50">
              <h3 className="text-sm font-medium mb-2 text-[#302E87]">Current Attachments</h3>
              <div className="space-y-2">
                {safeCurrentAttachments.map(attachment => (
                  <div key={attachment.id} className="flex items-center justify-between p-2 bg-[#FFE8D6]/20 rounded border border-[#FFE8D6]/50">
                    <div className="flex items-center gap-2">
                      {attachment.type === 'image' ? (
                        <button
                          onClick={() => setExpandedImage(attachment.url)}
                          className="w-8 h-8 rounded overflow-hidden shadow-sm"
                        >
                          <img
                            src={attachment.url}
                            alt={attachment.title || 'Attachment'}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ) : (
                        <LinkIcon className="w-4 h-4 text-[#302E87]" />
                      )}
                      <span className="text-sm truncate text-[#302E87]">
                        {attachment.title || attachment.url}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAttachment(attachment.id)}
                      className="hover:bg-[#F2918C]/20 hover:text-[#F2918C]"
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