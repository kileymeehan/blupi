import { useRef, useEffect, KeyboardEvent, useState, useCallback } from "react";
import { MessageSquare, ImageIcon, StickyNote, Smile, Tag, ChevronDown, X, Table as TableIcon, Beaker, CheckCircle, XCircle, Star } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import * as Icons from "lucide-react";
import type {
  Block as BlockType,
  Attachment,
  Department,
  SheetsConnection,
} from "@shared/schema";
import { ImageAttachmentDialog } from "./image-attachment-dialog";
import { getIconForBlockType } from "./type-utils";
import { LAYER_TYPES } from "./constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PendoMetrics } from "../pendo/pendo-metrics";
import { SimpleMetrics } from "../google-sheets/simple-metrics";
import { VideoBlock } from "./video-block";

// Function to get the border color for each block type
const getBlockBorderColor = (blockType: string, darkMode: boolean = false): string => {
  const layerType = LAYER_TYPES.find(type => type.type === blockType);
  
  // Use specific border color from constants for non-divider blocks
  if (layerType?.color && !layerType.isDivider) {
    return layerType.color;
  }
  
  if (!layerType) return darkMode ? "border-[#333333]" : "border-[#0A0A0F]";
  
  return darkMode ? "border-[#333333]" : "border-[#0A0A0F]";
};

interface BlockProps {
  block: BlockType & { readOnly?: boolean };
  boardId: number;
  onChange?: (content: string, newType?: string) => void;
  onAttachmentChange?: (id: string, attachments: Attachment[]) => void;
  onNotesChange?: (id: string, notes: string) => void;
  onEmojiChange?: (blockId: string, emoji: string) => void;
  onDepartmentChange?: (
    blockId: string,
    department: Department | undefined,
    customDepartment?: string,
  ) => void;
  bulkEditMode?: boolean;
  isSelected?: boolean;
  onSelectionToggle?: () => void;
  onSheetsConnectionChange?: (
    blockId: string, 
    connection: {
      sheetId: string;
      sheetName?: string;
      cellRange: string;
      label?: string;
      lastUpdated: string;
    }
  ) => void;
  onDelete?: (blockId: string) => void;
  isTemplate?: boolean;
  onCommentClick?: () => void;
  projectId?: number;
  isCondensed?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onFlag?: (blockId: string, reason?: string) => void;
  onUnflag?: (blockId: string) => void;
  isFlagged?: boolean;
  isDragging?: boolean;
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
  hypothesis: "Hypothesis",
  insight: "Insight",
  metrics: "Metrics",
  experiment: "Experiment",
  video: "Video",
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

// Helper function to extract experiment target value from content
const getExperimentTarget = (block: BlockType): string => {
  if (!block.content) return '';
  
  // Look for a target value embedded in the content as [target:X.XX]
  const targetMatch = block.content.match(/\[target:([^\]]+)\]/);
  if (targetMatch && targetMatch[1]) {
    return targetMatch[1];
  }
  
  return '';
};

export default function Block({
  block,
  boardId,
  onChange,
  onAttachmentChange,
  onNotesChange,
  onEmojiChange,
  onDepartmentChange,
  onSheetsConnectionChange,
  onDelete,
  isTemplate = false,
  onCommentClick,
  projectId,
  bulkEditMode = false,
  isSelected = false,
  onSelectionToggle,
  isCondensed = false,
  isExpanded = false,
  onToggleExpand,
  onFlag,
  onUnflag,
  isFlagged = false,
  isDragging = false,
}: BlockProps) {
  const darkMode = document.documentElement.classList.contains('dark');
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

  // Use the LightMetricsHandle type from the imported component
  const sheetsMetricsRef = useRef<Record<string, import("../google-sheets/light-metrics").LightMetricsHandle>>({});

  // Define the callback handler at component level to prevent stale closures
  const handleImagesChange = useCallback((images: Attachment[]) => {
    console.log('[Block] onImagesChange called with:', images);
    console.log('[Block] onAttachmentChange function exists:', !!onAttachmentChange);
    console.log('[Block] Block ID:', block.id);
    if (onAttachmentChange) {
      console.log('[Block] Calling onAttachmentChange...');
      onAttachmentChange(block.id, images);
      console.log('[Block] onAttachmentChange called successfully');
    } else {
      console.error('[Block] onAttachmentChange is undefined!');
    }
  }, [onAttachmentChange, block.id]);

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
  
  // Fix corrupted attachment data - ensure it's always an array and filter out invalid entries
  const safeAttachments = (() => {
    console.log(`[Block ${block.id}] Processing attachments. Raw data:`, block.attachments);
    console.log(`[Block ${block.id}] Attachments type:`, typeof block.attachments);
    console.log(`[Block ${block.id}] Is array:`, Array.isArray(block.attachments));
    
    if (!block.attachments) {
      console.log(`[Block ${block.id}] No attachments found, returning empty array`);
      return [];
    }
    if (!Array.isArray(block.attachments)) {
      console.log(`[Block ${block.id}] Attachments is not an array:`, typeof block.attachments, block.attachments);
      return [];
    }
    
    console.log(`[Block ${block.id}] Found ${block.attachments.length} raw attachments`);
    
    // Filter out invalid attachments and remove duplicates
    const validAttachments = block.attachments.filter(att => {
      const isValid = att && typeof att === 'object' && att.type && att.url;
      if (!isValid) {
        console.log(`[Block ${block.id}] Invalid attachment filtered out:`, att);
      }
      return isValid;
    });
    
    console.log(`[Block ${block.id}] Found ${validAttachments.length} valid attachments`);
    
    // Remove duplicates based on URL
    const uniqueAttachments = validAttachments.reduce((acc, current) => {
      const existing = acc.find(item => item.url === current.url);
      if (!existing) {
        acc.push(current);
      } else {
        console.log(`[Block ${block.id}] Duplicate attachment removed:`, current.url);
      }
      return acc;
    }, [] as Attachment[]);
    
    console.log(`[Block ${block.id}] Final safe attachments:`, uniqueAttachments);
    return uniqueAttachments;
  })();
  
  const attachmentCount = safeAttachments.length;

  return (
    <div 
      className={`w-full relative group ${
        isCondensed && !isExpanded ? 'min-h-[60px]' : 'aspect-[4/3]'
      }`}
    >


      {/* Delete button - appears on hover, positioned at bottom center */}
      {!isTemplate && !block.readOnly && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(block.id);
          }}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white hover:bg-gray-50 text-gray-600 rounded-full p-2 shadow-lg border border-gray-300 flex items-center justify-center"
          title="Delete block"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {block.emoji && (
        <div className={`absolute top-[-12px] right-[-20px] z-10 select-none ${
          isCondensed && !isExpanded ? 'text-2xl' : 'text-lg'
        }`}>
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
            ${isEditing ? "cursor-text" : "cursor-default"}
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
          className={`
            w-full relative
            ${getBlockBorderColor(block.type, darkMode)}
            ${block.type === 'video' ? 'border-4 rounded-none shadow-[4px_4px_0px_0px_#0A0A0F] dark:border-[#333333] dark:shadow-[4px_4px_0px_0px_#333333]' : ''}
            ${block.type !== 'video' ? 'bg-white dark:bg-[#12121A] border-4 rounded-none shadow-[4px_4px_0px_0px_#0A0A0F] dark:border-[#333333] dark:shadow-[4px_4px_0px_0px_#333333]' : ''}
            ${isCondensed && !isExpanded ? 'min-h-[50px] cursor-pointer hover:bg-[#FFD600] dark:hover:bg-[#FFD600] transition-colors' : 'min-h-[80px] aspect-[4/3]'}
          `}
          onClick={() => {
            if (isCondensed && !isExpanded && onToggleExpand) {
              onToggleExpand();
            }
          }}
        >
          {block.type === 'video' ? (
            <VideoBlock
              content={block.content}
              onChange={(content) => onChange?.(content)}
              isEditing={isEditing || !isTemplate}
            />
          ) : block.type === 'metrics' ? (
            <div className="w-full h-full relative overflow-hidden">
              <SimpleMetrics 
                ref={(ref) => {
                  if (ref) {
                    sheetsMetricsRef.current[block.id] = ref;
                  }
                }}
                blockId={block.id}
                boardId={boardId}
                initialConnection={block.sheetsConnection}
                className="w-full h-full"
                onUpdate={(connection) => {
                  try {
                    console.log("📊 Updating sheets connection for block:", block.id, "connection:", connection);
                    
                    if (onSheetsConnectionChange) {
                      const safeConnection = {
                        sheetId: connection.sheetId || "",
                        cellRange: connection.cellRange || "",
                        sheetName: connection.sheetName,
                        label: connection.label,
                        value: connection.value,
                        formattedValue: connection.formattedValue,
                        lastUpdated: connection.lastUpdated || new Date().toISOString()
                      };
                      
                      setTimeout(() => {
                        onSheetsConnectionChange(block.id, safeConnection);
                      }, 10);
                    }
                  } catch (error) {
                    console.error("Error updating sheets connection:", error);
                  }
                }}
              />
            </div>
          ) : (
            <>
              <div
                ref={contentRef}
                contentEditable={(isEditing || !isTemplate) && !block.readOnly && !(isCondensed && !isExpanded)}
                onInput={handleInput}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onDoubleClick={handleDoubleClick}
                className={`
                  block-content
                  w-full h-full
                  ${isCondensed && !isExpanded ? "p-2" : "p-3"}
                  ${block.emoji ? "pr-8" : ""} 
                  ${block.department ? "pb-10" : ""}
                  ${isTemplate ? "flex items-center justify-center" : ""}
                  overflow-y-auto whitespace-normal break-words
                  ${isCondensed && !isExpanded ? "leading-tight text-xs" : "leading-tight text-sm"}
                  focus:outline-none
                  ${isEditing ? "cursor-text" : "cursor-default"}
                  ${isCondensed && !isExpanded ? "line-clamp-2" : ""}
                `}
                suppressContentEditableWarning={true}
              >
                {isTemplate ? TYPE_LABELS[block.type] : (
                  isCondensed && !isExpanded && block.content ? 
                    (block.content.length > 50 ? block.content.substring(0, 50) + "..." : block.content) : 
                    block.content
                )}
              </div>

              {/* Display images in all blocks */}
              {safeAttachments.length > 0 && (
                <div className="absolute bottom-2 right-2 flex gap-1 z-10">
                  {safeAttachments.filter(att => att.type === 'image').slice(0, 3).map((attachment, index) => (
                    <button
                      key={attachment.id || index}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Open attachment dialog to view full image
                        setAttachmentDialogOpen(true);
                      }}
                      className="w-10 h-10 rounded overflow-hidden shadow-md border-2 border-white hover:border-blue-300 transition-all duration-200 hover:scale-105 cursor-pointer"
                      title={attachment.title || 'Click to view attachment'}
                    >
                      <img
                        src={attachment.url}
                        alt={attachment.title || 'Attachment'}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                  {safeAttachments.filter(att => att.type === 'image').length > 3 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAttachmentDialogOpen(true);
                      }}
                      className="w-10 h-10 rounded bg-gray-100 border-2 border-white shadow-md flex items-center justify-center text-xs text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
                      title={`+${safeAttachments.filter(att => att.type === 'image').length - 3} more images`}
                    >
                      +{safeAttachments.filter(att => att.type === 'image').length - 3}
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Add Experiment component with Google Sheets integration */}
          {!isTemplate && block.type === 'experiment' && (
            <div className="absolute bottom-2 left-2 right-2" id={`experiment-${block.id}`}>
              <div className="space-y-1">
                {/* Experiment configuration section */}
                {!block.sheetsConnection && (
                  <div className="flex flex-col gap-1 p-2 text-center bg-amber-50 rounded-md border border-amber-200">
                    <div className="text-xs font-medium text-amber-800">Experiment Setup</div>
                    <p className="text-xs text-amber-700">
                      Connect to a Google Sheet to track experiment results
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-xs border-amber-300 text-amber-700 hover:bg-amber-100 hover:text-amber-800 h-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Use the ref to directly open the dialog
                        if (sheetsMetricsRef.current[block.id]) {
                          sheetsMetricsRef.current[block.id].openConnectDialog();
                        }
                      }}
                    >
                      <Beaker className="mr-1 h-3 w-3" />
                      Connect Data Source
                    </Button>
                  </div>
                )}
                
                {/* Experiment data display */}
                {block.sheetsConnection && (
                  <div className="flex flex-col gap-1">
                    <SimpleMetrics 
                      ref={(ref) => {
                        if (ref) {
                          sheetsMetricsRef.current[block.id] = ref;
                        }
                      }}
                      blockId={block.id}
                      boardId={boardId}
                      initialConnection={block.sheetsConnection}
                      className="bg-amber-50 border-amber-200 text-xs"
                      onUpdate={(connection) => {
                        if (onSheetsConnectionChange && connection.sheetId && connection.cellRange) {
                          onSheetsConnectionChange(block.id, {
                            sheetId: connection.sheetId,
                            cellRange: connection.cellRange,
                            sheetName: connection.sheetName,
                            label: connection.label,
                            lastUpdated: connection.lastUpdated || new Date().toISOString()
                          });
                        }
                      }}
                    />
                    
                    {/* Experiment outcome section */}
                    <div className="flex items-center gap-1 p-1 rounded-md bg-white border border-amber-200">
                      <div className="text-xs font-medium text-amber-800">Target:</div>
                      <Input 
                        type="number"
                        placeholder="Target"
                        className="h-5 text-xs py-0 border-amber-200 w-16"
                        defaultValue={getExperimentTarget(block)}
                        onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                          const targetValue = parseFloat(e.target.value);
                          if (!isNaN(targetValue) && onChange) {
                            // Store the target in the content field with a special prefix
                            const existingContent = block.content || '';
                            const newContent = existingContent.includes('[target:') 
                              ? existingContent.replace(/\[target:[^\]]+\]/, `[target:${targetValue}]`)
                              : `${existingContent} [target:${targetValue}]`;
                            onChange(newContent);
                          }
                        }}
                      />
                      
                      {/* Show success/failure indicator if we have both a target and a value */}
                      {block.sheetsConnection?.formattedValue && getExperimentTarget(block) && (
                        <div className="ml-1">
                          {parseFloat(block.sheetsConnection.formattedValue) >= parseFloat(getExperimentTarget(block)) ? (
                            <div className="flex items-center text-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              <span className="text-xs">Success</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-red-600">
                              <XCircle className="h-3 w-3 mr-1" />
                              <span className="text-xs">Needs work</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk Edit Checkbox */}
      {bulkEditMode && (
        <div className="absolute top-1/2 left-[-8px] -translate-y-1/2 z-30">
          <div 
            className={`
              w-6 h-6 rounded border-2 cursor-pointer transition-all duration-200
              flex items-center justify-center shadow-md
              ${isSelected 
                ? 'bg-blue-600 border-blue-600' 
                : 'bg-white border-gray-400 hover:border-blue-400'
              }
            `}
            onClick={onSelectionToggle}
          >
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
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

            {/* Google Sheets icon for metrics or experiment blocks */}
            {(block.type === 'metrics' || block.type === 'experiment') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  // Use the ref to directly open the dialog
                  console.log(`Attempting to open dialog for block ${block.id}`);
                  if (sheetsMetricsRef.current && sheetsMetricsRef.current[block.id]) {
                    console.log(`Found reference, opening connection dialog for block ${block.id}`);
                    sheetsMetricsRef.current[block.id].openConnectDialog();
                  } else {
                    console.error(`Could not find metrics ref for block ${block.id}`);
                  }
                }}
                className={`
                  flex items-center justify-center w-6 h-6 p-0
                  rounded bg-white border ${block.type === 'experiment' ? 'border-amber-200' : 'border-gray-200'}
                  text-xs ${block.type === 'experiment' ? 'text-amber-600 hover:text-amber-900' : 'text-teal-600 hover:text-teal-900'}
                  shadow-sm hover:shadow ${block.type === 'experiment' ? 'hover:border-amber-300' : 'hover:border-teal-300'}
                  ${block.sheetsConnection ? `after:content-["•"] after:${block.type === 'experiment' ? 'text-amber-500' : 'text-teal-500'} after:absolute after:top-[-2px] after:right-[-2px]` : ""}
                  transition-all duration-150
                `}
                title={block.sheetsConnection ? "Connected to Google Sheets" : "Connect to Google Sheets"}
              >
                {block.type === 'experiment' ? <Beaker className="w-4 h-4" /> : <TableIcon className="w-4 h-4" />}
              </button>
            )}

            {/* Image attachment button - available for all block types */}
            <button
              onClick={() => {
                console.log('[Block] === IMAGE BUTTON CLICKED ===');
                console.log('[Block] Block ID:', block.id);
                console.log('[Block] Current attachmentDialogOpen state:', attachmentDialogOpen);
                console.log('[Block] Setting attachmentDialogOpen to true');
                setAttachmentDialogOpen(true);
                console.log('[Block] attachmentDialogOpen should now be true');
              }}
              className={`
                flex items-center justify-center w-6 h-6 p-0
                rounded bg-white border border-gray-200
                text-xs text-gray-600 hover:text-gray-900
                shadow-sm hover:shadow hover:border-gray-300
                ${attachmentCount > 0 ? 'after:content-["•"] after:text-blue-500 after:absolute after:top-[-2px] after:right-[-2px]' : ""}
                transition-all duration-150
                relative z-50
              `}
            >
              <ImageIcon className="w-4 h-4" />
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

            {/* Star button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isFlagged) {
                  onUnflag?.(block.id);
                } else {
                  onFlag?.(block.id);
                }
              }}
              className={`
                flex items-center justify-center w-6 h-6 p-0
                rounded bg-white border border-gray-200
                text-xs transition-all duration-150
                shadow-sm hover:shadow hover:border-gray-300
                ${isFlagged 
                  ? 'text-yellow-500 hover:text-yellow-600 after:content-["•"] after:text-yellow-500 after:absolute after:top-[-2px] after:right-[-2px]' 
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
              title={isFlagged ? "Remove star" : "Star for attention"}
            >
              <Star className={`w-4 h-4 ${isFlagged ? 'fill-current' : ''}`} />
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
                  ${isCondensed && !isExpanded ? 'scale-125' : ''}
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

          <ImageAttachmentDialog
            open={attachmentDialogOpen}
            onOpenChange={setAttachmentDialogOpen}
            currentImages={safeAttachments}
            onImagesChange={handleImagesChange}
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
