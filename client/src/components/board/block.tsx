import { useRef, useEffect, KeyboardEvent, useState } from "react";
import { MessageSquare, Paperclip, Link as LinkIcon, Image as ImageIcon, Video } from "lucide-react";
import type { Block as BlockType } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BlockProps {
  block: BlockType;
  onChange?: (id: string, content: string) => void;
  onAttachmentChange?: (id: string, attachment: { type: 'link' | 'image' | 'video', url: string }) => void;
  isTemplate?: boolean;
  onCommentClick?: () => void;
}

const TYPE_LABELS = {
  touchpoint: 'Touchpoint',
  role: 'Role',
  process: 'Process',
  pitfall: 'Pitfall',
  policy: 'Policy',
  technology: 'Technology',
  rationale: 'Rationale',
  question: 'Question',
  note: 'Note'
} as const;

export default function Block({ block, onChange, onAttachmentChange, isTemplate = false, onCommentClick }: BlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [selectedTab, setSelectedTab] = useState('link');

  useEffect(() => {
    if (contentRef.current && !isTemplate) {
      contentRef.current.textContent = block.content;
    }
  }, [block.content, isTemplate]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      contentRef.current?.blur();
    }
  };

  const handleBlur = () => {
    if (!onChange) return;
    const content = contentRef.current?.textContent || '';
    if (content !== block.content) {
      onChange(block.id, content);
    }
  };

  const handleAttachment = () => {
    if (!onAttachmentChange || !attachmentUrl) return;

    onAttachmentChange(block.id, {
      type: selectedTab as 'link' | 'image' | 'video',
      url: attachmentUrl
    });

    setAttachmentDialogOpen(false);
    setAttachmentUrl('');
  };

  const commentCount = block.comments?.length || 0;

  const renderAttachmentPreview = () => {
    if (!block.attachment) return null;

    switch (block.attachment.type) {
      case 'image':
        return (
          <img 
            src={block.attachment.url} 
            alt="Attachment" 
            className="max-w-full h-auto rounded mt-2"
          />
        );
      case 'video':
        return (
          <video 
            controls 
            className="max-w-full h-auto rounded mt-2"
          >
            <source src={block.attachment.url} />
            Your browser does not support the video tag.
          </video>
        );
      case 'link':
        return (
          <a 
            href={block.attachment.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline mt-2 block"
          >
            {block.attachment.url}
          </a>
        );
    }
  };

  return (
    <div className="group relative w-full h-full px-2">
      <div
        ref={contentRef}
        contentEditable={!isTemplate}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`
          w-full min-h-[120px] rounded-lg px-3 py-3 text-sm
          ${isTemplate ? 'flex items-center justify-center' : 'flex items-start text-left'}
          overflow-y-auto whitespace-pre-wrap break-words
          leading-normal
          transition-all duration-150 ease-out
          focus:outline-none focus:ring-2 focus:ring-primary/20
        `}
        style={{ backgroundColor: 'inherit' }}
        suppressContentEditableWarning={true}
      >
        {isTemplate && TYPE_LABELS[block.type]}
      </div>

      {renderAttachmentPreview()}

      {/* Type label - shows on hover */}
      <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-xs text-center text-gray-500 pb-1">
        {TYPE_LABELS[block.type]}
      </div>

      {/* Action buttons - only show if not template */}
      {!isTemplate && (
        <div className="absolute top-1 right-1 flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCommentClick?.();
            }}
            className={`
              flex items-center gap-1 p-1
              rounded bg-white/80 backdrop-blur-sm
              text-xs text-gray-600 hover:text-gray-900
              shadow-sm hover:shadow
              ${commentCount > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
              transition-all duration-150
            `}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{commentCount}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setAttachmentDialogOpen(true);
            }}
            className={`
              flex items-center gap-1 p-1
              rounded bg-white/80 backdrop-blur-sm
              text-xs text-gray-600 hover:text-gray-900
              shadow-sm hover:shadow
              opacity-0 group-hover:opacity-100
              transition-all duration-150
              ${block.attachment ? 'text-blue-600' : ''}
            `}
          >
            <Paperclip className="w-4 h-4" />
          </button>
        </div>
      )}

      <Dialog open={attachmentDialogOpen} onOpenChange={setAttachmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Attachment</DialogTitle>
            <DialogDescription>
              Add a link, image, or video to your block
            </DialogDescription>
          </DialogHeader>

          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="link">
                <LinkIcon className="w-4 h-4 mr-2" />
                Link
              </TabsTrigger>
              <TabsTrigger value="image">
                <ImageIcon className="w-4 h-4 mr-2" />
                Image
              </TabsTrigger>
              <TabsTrigger value="video">
                <Video className="w-4 h-4 mr-2" />
                Video
              </TabsTrigger>
            </TabsList>

            <TabsContent value="link" className="space-y-4">
              <Input
                placeholder="Enter URL"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
              />
            </TabsContent>

            <TabsContent value="image" className="space-y-4">
              <Input
                placeholder="Enter image URL"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
              />
            </TabsContent>

            <TabsContent value="video" className="space-y-4">
              <Input
                placeholder="Enter video URL"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
              />
            </TabsContent>
          </Tabs>

          <Button onClick={handleAttachment} className="w-full mt-4">
            Add Attachment
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}