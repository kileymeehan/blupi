import { useRef, useEffect, KeyboardEvent, useState } from "react";
import { MessageSquare, Paperclip, StickyNote, Smile, Tag, ChevronDown, X } from "lucide-react";
import * as Icons from "lucide-react";
import type {
  Block as BlockType,
  Attachment,
  Department,
} from "@shared/schema";
import { AttachmentDialog } from "./attachment-dialog";
import { getIconForBlockType } from "./type-utils";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface BlockProps {
  block: BlockType & { readOnly?: boolean };
  onChange?: (content: string, newType?: string) => void;
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
  opportunities: "Opportunities",
  metrics: "Metrics",
  hidden: "Hidden Step",
  "front-stage": "Front-Stage",
  "back-stage": "Back-Stage",
  "custom-divider": "Custom Divider",
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
  const [isEditing, setIsEditing] = useState(false);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);

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
    setIsEditing(false);
  };
  
  const handleDoubleClick = () => {
    if (isTemplate || block.readOnly) return;
    setIsEditing(true);
    if (contentRef.current) {
      contentRef.current.focus();
      // Create a range and selection to position cursor at the end
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(contentRef.current);
      range.collapse(false); // Collapse to end
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  const handleNotesChange = () => {
    if (!onNotesChange) return;
    onNotesChange(block.id, notes);
    setNotesDialogOpen(false);
  };

  const handleDepartmentChange = (department: Department | undefined) => {
    if (!onDepartmentChange) return;
    if (department && department === "Custom" as Department) {
      return;
    }
    onDepartmentChange(
      block.id,
      department,
      department && department === "Custom" as Department ? customDepartment : undefined,
    );
    setDepartmentDialogOpen(false);
    setCustomDepartment("");
  };

  const handleCustomDepartmentSave = () => {
    if (!onDepartmentChange || !customDepartment) return;
    onDepartmentChange(block.id, "Custom", customDepartment);
    setDepartmentDialogOpen(false);
  };

  const handleEmojiSelect = (emoji: any) => {
    if (!onEmojiChange) return;
    onEmojiChange(block.id, emoji.native);
    setEmojiPickerOpen(false);
  };
  
  // Function to handle changing block type
  const handleTypeChange = (newType: string) => {
    if (!onChange) return;
    
    // Call the board-grid's updateBlock function via the onChange prop
    // passing the content as the first parameter and the new type as the second
    onChange(block.content || '', newType);
    
    // Close the type menu
    setTypeMenuOpen(false);
  };

  const commentCount = block.comments?.length || 0;
  const attachmentCount = block.attachments?.length || 0;

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

      {/* Render divider blocks differently */}
      {block.type === "front-stage" || block.type === "back-stage" || block.type === "custom-divider" ? (
        <div
          ref={contentRef}
          contentEditable={(isEditing || !isTemplate) && !block.readOnly}
          onInput={handleInput}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onDoubleClick={handleDoubleClick}
          className={`
            w-full min-h-[40px] p-2
            flex items-center justify-center
            relative
            ${block.emoji ? "pr-8" : ""} 
            ${block.department ? "pb-6" : ""}
            overflow-hidden whitespace-pre-wrap break-words
            leading-normal
            focus:outline-none
            ${isEditing ? "cursor-text" : block.readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing"}
            ${block.type === "front-stage" ? "bg-blue-500/75 text-white" : ""}
            ${block.type === "back-stage" ? "bg-purple-500/75 text-white" : ""}
            ${block.type === "custom-divider" ? "bg-gray-600/75 text-white" : ""}
            border-2 border-white
            font-semibold
          `}
          suppressContentEditableWarning={true}
        >
          <div className="absolute inset-0 flex items-center justify-start px-4 pointer-events-none">
            <div className="w-full border-t-2 border-white opacity-50"></div>
          </div>
          
          <div className="relative z-10 px-4 bg-inherit rounded-md font-bold text-white flex items-center gap-2">
            {(block.type === "front-stage" || block.type === "back-stage") && (
              <>
                <ChevronDown className="w-4 h-4" />
                <ChevronDown className="w-4 h-4" />
              </>
            )}
            {isTemplate ? TYPE_LABELS[block.type] : block.content || TYPE_LABELS[block.type]}
            {(block.type === "front-stage" || block.type === "back-stage") && (
              <>
                <ChevronDown className="w-4 h-4" />
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </div>
          
          <div className="absolute inset-0 flex items-center justify-end px-4 pointer-events-none">
            <div className="w-full border-t-2 border-white opacity-50"></div>
          </div>
        </div>
      ) : (
        <div
          ref={contentRef}
          contentEditable={(isEditing || !isTemplate) && !block.readOnly}
          onInput={handleInput}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onDoubleClick={handleDoubleClick}
          className={`
            w-full min-h-[150px] max-h-[250px] p-4
            ${block.emoji ? "pr-8" : ""} 
            ${block.department ? "pb-12" : ""}
            ${isTemplate ? "flex items-center justify-center" : ""}
            overflow-y-auto whitespace-normal break-words
            leading-normal text
            focus:outline-none
            ${isEditing ? "cursor-text" : block.readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing"}
          `}
          suppressContentEditableWarning={true}
        >
          {isTemplate ? TYPE_LABELS[block.type] : block.content}
        </div>
      )}

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

          {/* Block type icon - only show for regular blocks, not dividers */}
          {block.type !== "front-stage" && block.type !== "back-stage" && block.type !== "custom-divider" && (
            <Popover open={typeMenuOpen} onOpenChange={setTypeMenuOpen}>
              <PopoverTrigger asChild>
                <div
                  className={`
                  absolute bottom-1 right-2
                  text-xs text-gray-700
                  flex items-center justify-center
                  bg-white/80 rounded-full p-1
                  shadow-sm
                  ${!block.readOnly ? "cursor-pointer hover:bg-gray-100" : ""}
                  transition-colors duration-150
                `}
                  onClick={(e) => {
                    if (block.readOnly) return;
                    e.stopPropagation();
                  }}
                  title={!block.readOnly ? "Click to change block type" : ""}
                >
                  {(() => {
                    // Get the icon name for the current block type
                    const iconName = getIconForBlockType(block.type);
                    
                    // Dynamically render the icon
                    const IconComponent = (Icons as any)[iconName] || Icons.Square;
                    
                    return <IconComponent className="w-4 h-4" />;
                  })()}
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2">
                <div className="text-sm font-medium mb-2">Change Block Type</div>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(TYPE_LABELS)
                    .filter(([type]) => !['front-stage', 'back-stage', 'custom-divider'].includes(type))
                    .map(([type, label]) => {
                      const iconName = getIconForBlockType(type);
                      const IconComponent = (Icons as any)[iconName] || Icons.Square;
                      
                      return (
                        <button
                          key={type}
                          className={`
                            flex items-center gap-2 p-2 text-xs rounded
                            ${type === block.type ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"}
                            transition-colors
                          `}
                          onClick={() => handleTypeChange(type)}
                        >
                          <IconComponent className="w-4 h-4" />
                          <span>{label}</span>
                        </button>
                      );
                    })
                  }
                </div>
              </PopoverContent>
            </Popover>
          )}

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
