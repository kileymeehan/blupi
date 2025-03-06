import { useRef, useEffect, KeyboardEvent, useState } from "react";
import { MessageSquare, Paperclip, StickyNote } from "lucide-react";
import type { Block as BlockType, Attachment } from "@shared/schema";
import { AttachmentDialog } from "./attachment-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface BlockProps {
  block: BlockType;
  onChange?: (id: string, content: string) => void;
  onAttachmentChange?: (id: string, attachments: Attachment[]) => void;
  onNotesChange?: (id: string, notes: string) => void;
  isTemplate?: boolean;
  onCommentClick?: () => void;
  projectId?: number;
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

export default function Block({ 
  block, 
  onChange, 
  onAttachmentChange, 
  onNotesChange,
  isTemplate = false, 
  onCommentClick, 
  projectId 
}: BlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notes, setNotes] = useState(block.notes || '');

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

  const handleNotesChange = () => {
    if (!onNotesChange) return;
    onNotesChange(block.id, notes);
    setNotesDialogOpen(false);
  };

  const commentCount = block.comments?.length || 0;
  const attachmentCount = block.attachments?.length || 0;

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
              opacity-0 group-hover:opacity-100
              ${commentCount > 0 ? '!opacity-100' : ''}
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
              ${attachmentCount > 0 ? '!opacity-100 text-blue-600' : ''}
              transition-all duration-150
            `}
          >
            <Paperclip className="w-4 h-4" />
            {attachmentCount > 0 && <span>{attachmentCount}</span>}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setNotesDialogOpen(true);
            }}
            className={`
              flex items-center gap-1 p-1
              rounded bg-white/80 backdrop-blur-sm
              text-xs text-gray-600 hover:text-gray-900
              shadow-sm hover:shadow
              opacity-0 group-hover:opacity-100
              ${block.notes ? '!opacity-100 text-yellow-600' : ''}
              transition-all duration-150
            `}
          >
            <StickyNote className="w-4 h-4" />
          </button>
        </div>
      )}

      <AttachmentDialog 
        open={attachmentDialogOpen}
        onOpenChange={setAttachmentDialogOpen}
        projectId={projectId}
        currentAttachments={block.attachments}
        onAttach={(attachments) => onAttachmentChange?.(block.id, attachments)}
      />

      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Add notes about this block..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[200px]"
            />
            <Button onClick={handleNotesChange} className="w-full">
              Save Notes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}