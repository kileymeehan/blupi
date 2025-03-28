import { useRef, useEffect, KeyboardEvent, useState } from "react";
import { MessageSquare, Paperclip, StickyNote, Smile, Tag } from "lucide-react";
import type {
  Block as BlockType,
  Attachment,
  Department,
} from "@shared/schema";
import { AttachmentDialog } from "./attachment-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

interface BlockProps {
  block: BlockType & { readOnly?: boolean }; // Add readOnly property
  onChange?: (content: string) => void;
  onAttachmentChange?: (id: string, attachments: Attachment[]) => void;
  onNotesChange?: (id: string, notes: string) => void;
  onEmojiChange?: (blockId: string, emoji: string) => void;
  onDepartmentChange?: (
    blockId: string,
    department: Department | undefined,
    customDepartment?: string,
  ) => void;
  isTemplate?: boolean;
  onCommentClick?: () => void;
  projectId?: number;
}

const TYPE_LABELS = {
  touchpoint: "Touchpoint",
  email: "Email",
  pendo: "Modal",
  role: "Role",
  process: "Process",
  friction: "Friction",
  policy: "Policy",
  technology: "Technology",
  rationale: "Rationale",
  question: "Question",
  note: "Note",
  hidden: "Hidden Step",
  separator: "Separator",
} as const;

const DEPARTMENTS = [
  "Engineering",
  "Marketing",
  "Product",
  "Design",
  "Brand",
  "Support",
  "Sales",
  "Custom",
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
  projectId,
}: BlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const [customDepartment, setCustomDepartment] = useState(
    block.customDepartment || "",
  );
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [notes, setNotes] = useState(block.notes || "");
  const [localContent, setLocalContent] = useState(block.content || "");

  useEffect(() => {
    if (contentRef.current && !isTemplate) {
      setLocalContent(block.content || "");
      contentRef.current.textContent = block.content || "";
    }
  }, [block.content, isTemplate]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      contentRef.current?.blur();
    }
  };

  const handleInput = () => {
    if (!contentRef.current) return;
    const newContent = contentRef.current.textContent || "";
    setLocalContent(newContent);
  };

  const handleBlur = () => {
    if (!onChange || !contentRef.current) return;
    const content = contentRef.current.textContent || "";
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
    if (department === "Custom" as Department) {
      return;
    }
    onDepartmentChange(
      block.id,
      department,
      department === "Custom" as Department ? customDepartment : undefined,
    );
    setDepartmentDialogOpen(false);
    setCustomDepartment("");
  };

  const handleCustomDepartmentSave = () => {
    if (!onDepartmentChange || !customDepartment) return;
    onDepartmentChange(block.id, "Custom" as Department, customDepartment);
    setDepartmentDialogOpen(false);
  };

  const handleEmojiSelect = (emoji: any) => {
    if (!onEmojiChange) return;
    onEmojiChange(block.id, emoji.native);
    setEmojiPickerOpen(false);
  };

  const commentCount = block.comments?.length || 0;
  const attachmentCount = block.attachments?.length || 0;

  // Special rendering for separator blocks
  if (block.type === 'separator' && !isTemplate) {
    return (
      <div className="w-full h-full relative group">
        <div className="w-full flex items-center px-4 py-2 min-h-[50px]">
          <div className="flex-grow h-[2px] bg-gray-400"></div>
          <div 
            ref={contentRef}
            contentEditable={!isTemplate && !block.readOnly}
            onInput={handleInput}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="mx-4 px-4 py-1 text-sm text-gray-700 font-semibold bg-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 whitespace-nowrap overflow-hidden border border-gray-300"
            suppressContentEditableWarning={true}
          >
            {block.content || "Section Separator"}
          </div>
          <div className="flex-grow h-[2px] bg-gray-400"></div>
          
          {/* Label showing it's a separator */}
          <div className="absolute top-[-16px] right-2 text-xs text-gray-600 bg-white px-1 opacity-0 group-hover:opacity-100">
            {TYPE_LABELS[block.type]}
          </div>
        </div>

        {!isTemplate && !block.readOnly && (
          <div className="absolute top-[-16px] left-1/2 transform -translate-x-1/2 flex items-center gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCommentClick?.();
              }}
              className="flex items-center justify-center w-8 h-6 p-0 rounded bg-white border border-gray-200 text-xs text-gray-600 hover:text-gray-900 shadow-sm hover:shadow hover:border-gray-300 transition-all duration-150"
            >
              <MessageSquare className="w-4 h-4" />
              {(block.comments?.length || 0) > 0 && (
                <span className="text-[10px] ml-0.5">{block.comments?.length}</span>
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Regular block rendering
  return (
    <div className="w-full h-full relative group">
      {block.emoji && (
        <div className="absolute top-[-12px] right-[-20px] z-10 text-lg select-none">
          {block.emoji}
        </div>
      )}

      {block.department && (
        <div className="absolute bottom-1 left-1 z-10 px-2 py-0.5 text-xs bg-white rounded-md shadow-sm border border-gray-200">
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
          w-full min-h-[100px] p-4
          ${block.emoji ? "pr-8" : ""} 
          ${block.department ? "pb-12" : ""}
          ${isTemplate ? "flex items-center justify-center" : ""}
          overflow-y-auto whitespace-pre-wrap break-words
          leading-normal text
          focus:outline-none
          ${block.readOnly ? "cursor-default" : ""}
        `}
        suppressContentEditableWarning={true}
      >
        {isTemplate ? TYPE_LABELS[block.type] : block.content}
      </div>

      {!isTemplate && !block.readOnly && (
        <>
          <div className="absolute top-[-16px] left-1/2 transform -translate-x-1/2 flex items-center gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCommentClick?.();
              }}
              className={`
                flex items-center justify-center w-8 h-6 p-0
                rounded bg-white border border-gray-200
                text-xs text-gray-600 hover:text-gray-900
                shadow-sm hover:shadow hover:border-gray-300
                ${commentCount > 0 ? 'after:content-["•"] after:text-blue-500 after:absolute after:top-[-2px] after:right-[-2px]' : ""}
                transition-all duration-150
              `}
            >
              <MessageSquare className="w-4 h-4" />
              {commentCount > 0 && (
                <span className="text-[10px] ml-0.5">{commentCount}</span>
              )}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setAttachmentDialogOpen(true);
              }}
              className={`
                flex items-center justify-center w-6 h-6 p-0
                rounded bg-white border border-gray-200
                text-xs text-gray-600 hover:text-gray-900
                shadow-sm hover:shadow hover:border-gray-300
                ${attachmentCount > 0 ? 'after:content-["•"] after:text-blue-500 after:absolute after:top-[-2px] after:right-[-2px]' : ""}
                transition-all duration-150
              `}
            >
              <Paperclip className="w-4 h-4" />
              {attachmentCount > 0 && (
                <span className="text-[10px] ml-0.5">{attachmentCount}</span>
              )}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setNotesDialogOpen(true);
              }}
              className={`
                flex items-center justify-center w-6 h-6 p-0
                rounded bg-white border border-gray-200
                text-xs text-gray-600 hover:text-gray-900
                shadow-sm hover:shadow hover:border-gray-300
                ${block.notes ? 'after:content-["•"] after:text-yellow-500 after:absolute after:top-[-2px] after:right-[-2px]' : ""}
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
                flex items-center justify-center w-6 h-6 p-0
                rounded bg-white border border-gray-200
                text-xs text-gray-600 hover:text-gray-900
                shadow-sm hover:shadow hover:border-gray-300
                transition-all duration-150
              `}
            >
              <Tag className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (block.emoji) {
                  onEmojiChange?.(block.id, "");
                } else {
                  setEmojiPickerOpen(true);
                }
              }}
              className={`
                flex items-center justify-center w-6 h-6 p-0
                rounded bg-white border border-gray-200
                text-xs text-gray-600 hover:text-gray-900
                shadow-sm hover:shadow hover:border-gray-300
                ${block.emoji ? 'after:content-["•"] after:text-yellow-500 after:absolute after:top-[-2px] after:right-[-2px]' : ""}
                transition-all duration-150
              `}
              title={block.emoji ? "Remove emoji" : "Add emoji"}
            >
              <Smile className="w-4 h-4" />
            </button>
          </div>

          {/* Block type label */}
          <div
            className={`
            absolute bottom-1 right-2
            text-xs text-gray-700
            opacity-0 group-hover:opacity-60
            transition-opacity duration-200
          `}
          >
            {TYPE_LABELS[block.type]}
          </div>

          <AttachmentDialog
            open={attachmentDialogOpen}
            onOpenChange={setAttachmentDialogOpen}
            projectId={projectId}
            currentAttachments={block.attachments}
            onAttach={(attachments) =>
              onAttachmentChange?.(block.id, attachments)
            }
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

          <Dialog
            open={departmentDialogOpen}
            onOpenChange={setDepartmentDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select Department</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {DEPARTMENTS.map((dept) => (
                    <Button
                      key={dept}
                      variant={
                        block.department === dept ? "default" : "outline"
                      }
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

                {block.department === "Custom" && (
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
        </>
      )}
    </div>
  );
}
