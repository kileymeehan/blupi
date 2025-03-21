import { useRef, useEffect, KeyboardEvent, useState } from "react";
import { MessageSquare, Paperclip, StickyNote, Smile, Tag } from "lucide-react";
import type { Block as BlockType, Attachment, Department } from "@shared/schema";
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
  onDepartmentChange?: (blockId: string, department: Department | undefined, customDepartment?: string) => void;
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

const DEPARTMENTS = [
  'Engineering',
  'Marketing',
  'Product',
  'Design',
  'Brand',
  'Support',
  'Sales',
  'Custom'
] as const;

export default function Block({
  block,
  onChange,
  onAttachmentChange,
  onNotesChange,
  onEmojiChange,
  onDepartmentChange,
  isTemplate = false,
  onCommentClick,
  projectId
}: BlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const [customDepartment, setCustomDepartment] = useState(block.customDepartment || '');
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

  const handleDepartmentChange = (department: Department | undefined) => {
    if (!onDepartmentChange) return;
    if (department === 'Custom') {
      // Keep the dialog open for custom input
      return;
    }
    onDepartmentChange(block.id, department, department === 'Custom' ? customDepartment : undefined);
    setDepartmentDialogOpen(false);
    setCustomDepartment('');
  };

  const handleCustomDepartmentSave = () => {
    if (!onDepartmentChange || !customDepartment) return;
    onDepartmentChange(block.id, 'Custom', customDepartment);
    setDepartmentDialogOpen(false);
  };

  const handleEmojiSelect = (emoji: any) => {
    if (!onEmojiChange) return;
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

      {/* Show department tag if set */}
      {block.department && (
        <div className="absolute bottom-1 left-1 z-10 px-2 py-0.5 text-xs bg-white rounded-md shadow-sm border border-gray-200">
          {block.customDepartment || block.department}
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
          absolute bottom-0 inset-x-0 px-2 py-1
          text-xs text-gray-500
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200
          text-right mr-2 whitespace-nowrap overflow-hidden text-ellipsis
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
              setDepartmentDialogOpen(true);
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
            <Tag className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (block.emoji) {
                onEmojiChange?.(block.id, '');
              } else {
                setEmojiPickerOpen(true);
              }
            }}
            className={`
              flex items-center gap-1 p-1
              rounded bg-white/80 backdrop-blur-sm
              text-xs text-gray-600 hover:text-gray-900
              shadow-sm hover:shadow
              opacity-0 group-hover:opacity-100
              ${block.emoji ? 'text-yellow-600' : ''}
              transition-all duration-150
            `}
            title={block.emoji ? "Remove emoji" : "Add emoji"}
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

      <Dialog open={departmentDialogOpen} onOpenChange={setDepartmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Department</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {DEPARTMENTS.map((dept) => (
                <Button
                  key={dept}
                  variant={block.department === dept ? "default" : "outline"}
                  onClick={() => handleDepartmentChange(dept as Department)}
                  className="w-full"
                >
                  {dept}
                </Button>
              ))}
              <Button
                variant="outline"
                onClick={() => handleDepartmentChange(undefined)}
                className="w-full col-span-2 text-red-600 hover:text-red-700"
              >
                Clear Department
              </Button>
            </div>

            {block.department === 'Custom' && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Enter custom department name..."
                  value={customDepartment}
                  onChange={(e) => setCustomDepartment(e.target.value)}
                  className="min-h-[80px]"
                />
                <Button
                  onClick={handleCustomDepartmentSave}
                  className="w-full"
                  disabled={!customDepartment}
                >
                  Save Custom Department
                </Button>
              </div>
            )}
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