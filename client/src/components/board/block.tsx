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
  onAttachmentChange?: (attachments: Attachment[]) => void;
  onNotesChange?: (notes: string) => void;
  onEmojiChange?: (blockId: string, emoji: string) => void;
  onDepartmentChange?: (blockId: string, department: Department | undefined, customDepartment?: string) => void;
  isTemplate?: boolean;
  onCommentClick?: () => void;
  projectId?: number;
}

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
  };

  const handleBlur = () => {
    if (!onChange || !contentRef.current) return;
    const content = contentRef.current.textContent || '';
    if (content !== block.content) {
      onChange(content);
    }
  };

  const commentCount = block.comments?.length || 0;
  const attachmentCount = block.attachments?.length || 0;

  return (
    <div className="w-full h-full relative p-6">
      {block.emoji && (
        <div className="absolute top-4 right-4 z-10 text-lg select-none">
          {block.emoji}
        </div>
      )}

      {block.department && (
        <div className="absolute bottom-4 left-4 z-10 px-2 py-0.5 text-xs bg-white/90 rounded-md shadow-sm border border-gray-200">
          {block.customDepartment || block.department}
        </div>
      )}

      <div
        ref={contentRef}
        contentEditable={!isTemplate && !block.readOnly}
        onInput={handleInput}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`
          w-full min-h-[150px]
          ${block.emoji ? 'pr-12' : ''} 
          ${block.department ? 'pb-12' : ''}
          ${isTemplate ? 'flex items-center justify-center' : ''}
          overflow-y-auto whitespace-pre-wrap break-words
          leading-normal text
          focus:outline-none
          ${block.readOnly ? 'cursor-default' : ''}
        `}
        suppressContentEditableWarning={true}
      >
        {isTemplate ? block.type : localContent}
      </div>

      {!isTemplate && !block.readOnly && (
        <div className="absolute top-4 right-4 flex gap-2 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCommentClick?.();
            }}
            className={`
              flex items-center gap-1 p-2
              rounded bg-white/90 backdrop-blur-sm
              text-xs text-gray-600 hover:text-gray-900
              shadow-sm hover:shadow
              opacity-0 group-hover:opacity-100
              ${commentCount > 0 ? '!opacity-100' : ''}
              transition-all duration-200
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
              flex items-center gap-1 p-2
              rounded bg-white/90 backdrop-blur-sm
              text-xs text-gray-600 hover:text-gray-900
              shadow-sm hover:shadow
              opacity-0 group-hover:opacity-100
              ${attachmentCount > 0 ? '!opacity-100 text-blue-600' : ''}
              transition-all duration-200
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
              flex items-center gap-1 p-2
              rounded bg-white/90 backdrop-blur-sm
              text-xs text-gray-600 hover:text-gray-900
              shadow-sm hover:shadow
              opacity-0 group-hover:opacity-100
              ${block.notes ? '!opacity-100 text-yellow-600' : ''}
              transition-all duration-200
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
              flex items-center gap-1 p-2
              rounded bg-white/90 backdrop-blur-sm
              text-xs text-gray-600 hover:text-gray-900
              shadow-sm hover:shadow
              opacity-0 group-hover:opacity-100
              transition-all duration-200
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
              flex items-center gap-1 p-2
              rounded bg-white/90 backdrop-blur-sm
              text-xs text-gray-600 hover:text-gray-900
              shadow-sm hover:shadow
              opacity-0 group-hover:opacity-100
              ${block.emoji ? 'text-yellow-600' : ''}
              transition-all duration-200
            `}
            title={block.emoji ? "Remove emoji" : "Add emoji"}
          >
            <Smile className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dialogs */}
      {!block.readOnly && (
        <>
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
                <Button onClick={() => {
                  if (!onNotesChange) return;
                  onNotesChange(notes);
                  setNotesDialogOpen(false);
                }} className="w-full">
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
                  {['Engineering', 'Marketing', 'Product', 'Design', 'Brand', 'Support', 'Sales', 'Custom'].map((dept) => (
                    <Button
                      key={dept}
                      variant={block.department === dept ? "default" : "outline"}
                      onClick={() => {
                        if (!onDepartmentChange) return;
                        const department = dept as Department;
                        onDepartmentChange(block.id, department, department === 'Custom' ? customDepartment : undefined);
                        if (department !== 'Custom') {
                          setDepartmentDialogOpen(false);
                        }
                      }}
                      className="w-full"
                    >
                      {dept}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!onDepartmentChange) return;
                      onDepartmentChange(block.id, undefined);
                      setDepartmentDialogOpen(false);
                    }}
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
                      onClick={() => {
                        if (!onDepartmentChange || !customDepartment) return;
                        onDepartmentChange(block.id, 'Custom', customDepartment);
                        setDepartmentDialogOpen(false);
                      }}
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
                  onEmojiSelect={(emoji: any) => {
                    if (!onEmojiChange) return;
                    onEmojiChange(block.id, emoji.native);
                    setEmojiPickerOpen(false);
                  }}
                  theme="light"
                />
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}