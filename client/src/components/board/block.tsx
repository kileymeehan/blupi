import { useRef, useEffect, KeyboardEvent, useState } from "react";
import { MessageSquare, Paperclip, StickyNote, Smile } from "lucide-react";
import type { Block as BlockType, Attachment } from "@shared/schema";
import { AttachmentDialog } from "./attachment-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'

interface BlockProps {
  block: BlockType;
  onChange?: (content: string) => void;
  onAttachmentChange?: (id: string, attachments: Attachment[]) => void;
  onNotesChange?: (id: string, notes: string) => void;
  onEmojiChange?: (blockId: string, emoji: string) => void;
  isTemplate?: boolean;
  onCommentClick?: () => void;
  projectId?: number;
}

const TYPE_LABELS = {
  touchpoint: 'Touchpoint',
  email: 'Email Touchpoint',
  pendo: 'Pendo Touchpoint',
  role: 'Role',
  process: 'Process',
  friction: 'Friction',
  policy: 'Policy',
  technology: 'Technology',
  rationale: 'Rationale',
  question: 'Question',
  note: 'Note',
  hidden: 'Hidden Step'
} as const;

export default function Block({
  block,
  onChange,
  onAttachmentChange,
  onNotesChange,
  onEmojiChange,
  isTemplate = false,
  onCommentClick,
  projectId
}: BlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [notes, setNotes] = useState(block.notes || '');
  const [localContent, setLocalContent] = useState(block.content || '');

  // Update content when block changes from external source
  useEffect(() => {
    if (contentRef.current && !isTemplate) {
      setLocalContent(block.content || '');
      contentRef.current.textContent = block.content || '';
    }
  }, [block.content, isTemplate]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      contentRef.current?.blur();
    }
  };

  const handleInput = () => {
    if (!contentRef.current) return;
    const newContent = contentRef.current.textContent || '';
    setLocalContent(newContent);

    // Preserve cursor position at end of text
    if (contentRef.current) {
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(contentRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  };

  const handleBlur = () => {
    if (!onChange || !contentRef.current) return;
    const content = contentRef.current.textContent || '';
    if (content !== block.content) {
      onChange(content);
    }
  };

  const handleNotesChange = () => {
    if (!onNotesChange) return;
    onNotesChange(block.id, notes);
    setNotesDialogOpen(false);
  };

  const handleEmojiSelect = (emoji: any) => {
    if (!onEmojiChange) return;
    // emoji-mart provides the actual emoji character in the native property
    onEmojiChange(block.id, emoji.native);
    setEmojiPickerOpen(false);
  };

  const commentCount = block.comments?.length || 0;
  const attachmentCount = block.attachments?.length || 0;

  return (
    <div className="w-full h-full p-2">
      {block.emoji && (
        <div className="absolute -top-2 -right-2 z-10 text-lg cursor-default">
          <span role="img" aria-label="emoji" className="select-none">
            {block.emoji}
          </span>
        </div>
      )}

      <div
        ref={contentRef}
        contentEditable={!isTemplate}
        onInput={handleInput}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`
          w-full min-h-[100px] px-3 py-4 pt-8 text-sm
          ${isTemplate ? 'flex items-center justify-center' : ''}
          overflow-y-auto whitespace-pre-wrap break-words
          leading-normal text-center
          focus:outline-none
          focus:bg-white/50
          transition-colors duration-200
        `}
        style={{ backgroundColor: 'inherit' }}
        suppressContentEditableWarning={true}
      >
        {isTemplate ? TYPE_LABELS[block.type] : localContent}
      </div>

      {!isTemplate && (
        <div className={`
          absolute bottom-0 right-0 px-2 py-1 
          text-xs text-gray-500 bg-white/80 
          rounded-tl opacity-0 group-hover:opacity-100
          transition-opacity duration-200
        `}>
          {TYPE_LABELS[block.type]}
        </div>
      )}

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

          <button
            onClick={(e) => {
              e.stopPropagation();
              setEmojiPickerOpen(true);
            }}
            className={`
              flex items-center gap-1 p-1
              rounded bg-white/80 backdrop-blur-sm
              text-xs text-gray-600 hover:text-gray-900
              shadow-sm hover:shadow
              opacity-0 group-hover:opacity-100
              transition-all duration-150
            `}
          >
            <Smile className="w-4 h-4" />
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

      <Dialog open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Emoji</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Picker
              data={data}
              onEmojiSelect={handleEmojiSelect}
              theme="light"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}