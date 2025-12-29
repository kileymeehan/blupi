import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import {
  Plus,
  GripVertical,
  Home,
  LayoutGrid,
  UserCircle2,
  ArrowUpFromLine,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  Info,
  Upload,
  Folder,
  User,
  FileDown,
  MessageSquare,
  Filter,
  Maximize2,
  Map,
  X,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Minimize2,
  Play,
  SkipForward,
  SkipBack,
  Fullscreen,
  Sun,
  Moon,
  Download,
  FileType,
  Presentation,
  Flag,
  Layers,
  TrendingUp,
  Eye,
  Check,
  Settings,
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import html2canvas from 'html2canvas';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Block from "./block";
import BlockDrawer from "./block-drawer";
import { CommentDialog } from "./comment-dialog";
import type {
  Board,
  Block as BlockType,
  Phase,
  Department,
  Attachment,
} from "@shared/schema";
import { nanoid } from "nanoid";
import { getDepartmentInfo } from "./department-utils";
import { getIconForBlockType } from "./type-utils";
import * as Icons from "lucide-react";
import ImageUpload from "./image-upload";
import { CommentsOverview } from "./comments-overview";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AddToProjectDialog from "./add-to-project-dialog";
import { UsersPresence } from "./users-presence";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { UserPlus, Link as LinkIcon } from "lucide-react";
import { jsPDF } from "jspdf";
import { LAYER_TYPES } from "./constants";
import { DepartmentFilter } from "./department-filter";
import { SheetDocumentsManager } from "@/components/google-sheets/sheet-documents-manager";
import { FileSpreadsheet } from "lucide-react";
import { BlueprintImportTrigger } from "./blueprint-import-dialog";
import { CustomScrollbar } from "./custom-scrollbar";
import { ProfileModal } from "@/components/profile-modal";
import { ProfileIcon } from "@/components/profile-icon";
import { EmotionJourney } from "./emotion-journey";
import type { Emotion } from "@shared/schema";




interface BoardGridProps {
  id: string;
  board: Board;
  project?: any;
  onBlocksChange: (blocks: BlockType[]) => void;
  onPhasesChange: (phases: Phase[]) => void;
  onBoardChange: (board: Board) => void;
  connectedUsers?: Array<{ id: string; name: string; color: string }>;
  isPublicView?: boolean;
}

export default function BoardGrid({
  id,
  board,
  project: projectData,
  onBlocksChange,
  onPhasesChange,
  onBoardChange,
  connectedUsers = [],
  isPublicView = false,
}: BoardGridProps) {
  const [_, setLocation] = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedBoardName, setEditedBoardName] = useState(board.name);
  const [selectedBlock, setSelectedBlock] = useState<BlockType | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showBlocks, setShowBlocks] = useState(true);
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(
    null,
  );
  const [addToProjectOpen, setAddToProjectOpen] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [blueprintDetails, setBlueprintDetails] = useState("");
  const [personaDetails, setPersonaDetails] = useState("");
  const [personaImage, setPersonaImage] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [shareLinkOpen, setShareLinkOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [expandedStepText, setExpandedStepText] = useState("");
  const [stepTextDialogOpen, setStepTextDialogOpen] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [showDepartments, setShowDepartments] = useState(false);
  
  const [showGoogleSheets, setShowGoogleSheets] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [scrollStartX, setScrollStartX] = useState(0);
  const [isModifierKeyPressed, setIsModifierKeyPressed] = useState(false);
  const [isDuplicateMode, setIsDuplicateMode] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState<
    Department | undefined
  >(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [showMinimap, setShowMinimap] = useState(false);
  const minimapRef = useRef<HTMLDivElement>(null);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedBlocks, setSelectedBlocks] = useState<Set<string>>(new Set());
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [showEmotionJourney, setShowEmotionJourney] = useState(false);
  const [groupBlocksByType, setGroupBlocksByType] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showAlternatingColumns, setShowAlternatingColumns] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Apply dark mode to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Cleanup on unmount - remove dark class when leaving board
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, [darkMode]);
  
  // Flagging state
  const [flaggedBlocks, setFlaggedBlocks] = useState<Set<string>>(new Set());

  // Query to get current user's flagged blocks for this board
  const { data: currentUserFlaggedBlocks } = useQuery({
    queryKey: ["/api/flagged-blocks"],
  });

  // Initialize flagged blocks state when data loads
  useEffect(() => {
    if (currentUserFlaggedBlocks && Array.isArray(currentUserFlaggedBlocks)) {
      const flaggedBlockIds = currentUserFlaggedBlocks
        .filter((item: any) => item.boardId === parseInt(id))
        .map((item: any) => item.blockId);
      setFlaggedBlocks(new Set(flaggedBlockIds));
    }
  }, [currentUserFlaggedBlocks, id]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Flagging mutations
  const flagBlockMutation = useMutation({
    mutationFn: async ({ blockId, reason }: { blockId: string; reason?: string }) => {
      console.log('🏁 Flagging block:', { blockId, reason, boardId: id });
      const url = `/api/boards/${id}/blocks/${blockId}/flag`;
      console.log('🏁 Request URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });
      
      console.log('🏁 Response status:', response.status);
      console.log('🏁 Response headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('🏁 Raw response:', responseText);
      
      if (!response.ok) {
        console.error('🏁 Request failed:', {
          status: response.status,
          statusText: response.statusText,
          body: responseText
        });
        throw new Error(`Failed to flag block: ${response.status} ${response.statusText}`);
      }
      
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error('🏁 JSON parse error:', parseError);
        console.error('🏁 Response was not JSON:', responseText);
        throw new Error('Server returned invalid JSON response');
      }
    },
    onSuccess: (_, { blockId }) => {
      setFlaggedBlocks(prev => new Set(Array.from(prev).concat(blockId)));
      queryClient.invalidateQueries({ queryKey: ["/api/flagged-blocks"] });
      toast({
        title: "Block starred",
        description: "Block has been starred for attention",
      });
    },
    onError: (error) => {
      console.error('Error flagging block:', error);
      toast({
        title: "Error",
        description: "Failed to flag block",
        variant: "destructive",
      });
    },
  });

  const unflagBlockMutation = useMutation({
    mutationFn: async (blockId: string) => {
      const response = await fetch(`/api/boards/${id}/blocks/${blockId}/unflag`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to unflag block');
      }
      return response.json();
    },
    onSuccess: (_, blockId) => {
      setFlaggedBlocks(prev => {
        const newSet = new Set(Array.from(prev));
        newSet.delete(blockId);
        return newSet;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/flagged-blocks"] });
      toast({
        title: "Star removed",
        description: "Block star has been removed",
      });
    },
    onError: (error) => {
      console.error('Error unflagging block:', error);
      toast({
        title: "Error",
        description: "Failed to remove flag",
        variant: "destructive",
      });
    },
  });

  // Flagging handler functions
  const handleFlagBlock = (blockId: string, reason?: string) => {
    flagBlockMutation.mutate({ blockId, reason });
  };

  const handleUnflagBlock = (blockId: string) => {
    unflagBlockMutation.mutate(blockId);
  };
  
  // Presentation mode state
  const [presentationMode, setPresentationMode] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [presentationNotes, setPresentationNotes] = useState("");
  const [addBlockPopoverOpen, setAddBlockPopoverOpen] = useState(false);
  const [newBlockContent, setNewBlockContent] = useState("");
  const [selectedBlockType, setSelectedBlockType] = useState<string | null>(null);
  const [presentationDarkMode, setPresentationDarkMode] = useState(false);
  const [presentationViewMode, setPresentationViewMode] = useState<'compact' | 'large'>('compact');
  const [blockTypeDropdownOpen, setBlockTypeDropdownOpen] = useState(false);
  
  // Board view mode state
  const [boardViewMode, setBoardViewMode] = useState<'normal' | 'condensed'>('normal');
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  
  // Quick block creation state
  const [hoveredColumn, setHoveredColumn] = useState<{phaseIndex: number, columnIndex: number} | null>(null);
  const [showBlockTypeMenu, setShowBlockTypeMenu] = useState<{phaseIndex: number, columnIndex: number} | null>(null);
  
  // Get all steps (columns) across all phases for presentation
  const allSteps = useMemo(() => {
    const steps: Array<{ 
      phaseIndex: number; 
      columnIndex: number; 
      phaseName: string; 
      columnName: string; 
      columnImage?: string;
      blocks: BlockType[] 
    }> = [];
    
    board.phases.forEach((phase, phaseIndex) => {
      phase.columns.forEach((column, columnIndex) => {
        const columnBlocks = board.blocks.filter(
          block => block.phaseIndex === phaseIndex && block.columnIndex === columnIndex
        );
        
        steps.push({
          phaseIndex,
          columnIndex,
          phaseName: phase.name,
          columnName: column.name,
          columnImage: column.image,
          blocks: columnBlocks
        });
      });
    });
    
    return steps;
  }, [board.phases, board.blocks]);
  
  const currentStep = allSteps[currentStepIndex];

  // Add new block in presentation mode
  const handleAddBlock = () => {
    if (!selectedBlockType || !currentStep) return;

    const selectedType = LAYER_TYPES.find(t => t.type === selectedBlockType);
    const newBlock: BlockType = {
      id: nanoid(),
      type: selectedBlockType as any,
      content: newBlockContent,
      phaseIndex: currentStep.phaseIndex,
      columnIndex: currentStep.columnIndex,
      comments: [],
      attachments: [],
      experimentTarget: "",
      customDepartment: "",
      emoji: "",
      isDivider: selectedType?.isDivider || false,
      flagged: false,
    };

    const updatedBlocks = [...board.blocks, newBlock];
    onBlocksChange(updatedBlocks);
    
    // Reset form
    setNewBlockContent("");
    setSelectedBlockType(null);
    setAddBlockPopoverOpen(false);
  };
  
  const nextStep = () => {
    console.log('NextStep called:', { currentStepIndex, totalSteps: allSteps.length });
    if (currentStepIndex < allSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };
  
  const prevStep = () => {
    console.log('PrevStep called:', { currentStepIndex, totalSteps: allSteps.length });
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };
  
  const exitPresentationMode = () => {
    setPresentationMode(false);
    setCurrentStepIndex(0);
  };
  
  // Keyboard navigation for presentation mode
  useEffect(() => {
    if (!presentationMode) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = e.target as HTMLElement;
      const isTyping = target instanceof HTMLInputElement || 
                      target instanceof HTMLTextAreaElement || 
                      target.contentEditable === 'true' ||
                      target.closest('[contenteditable="true"]') ||
                      target.closest('input') ||
                      target.closest('textarea');
      
      console.log('Keydown in presentation mode:', e.key, { currentStepIndex, totalSteps: allSteps.length, isTyping });
      
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          // Only handle spacebar/arrow if not typing
          if (!isTyping) {
            e.preventDefault();
            console.log('Attempting to go to next step');
            if (currentStepIndex < allSteps.length - 1) {
              setCurrentStepIndex(prev => prev + 1);
            }
          }
          break;
        case 'ArrowLeft':
          // Only handle arrow if not typing
          if (!isTyping) {
            e.preventDefault();
            console.log('Attempting to go to previous step');
            if (currentStepIndex > 0) {
              setCurrentStepIndex(prev => prev - 1);
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          console.log('Exiting presentation mode');
          setPresentationMode(false);
          setCurrentStepIndex(0);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [presentationMode, currentStepIndex, allSteps.length]);
  
  // Drag state protection to prevent DOM conflicts
  const [isDragActive, setIsDragActive] = useState(false);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Undo functionality
  const [undoHistory, setUndoHistory] = useState<{action: string, blocks: BlockType[]}[]>([]);
  


  // Fetch project boards for the sidebar
  const { data: projectBoards } = useQuery<Board[]>({
    queryKey: ['/api/projects', board.projectId, 'boards'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${board.projectId}/boards`);
      if (!response.ok) throw new Error('Failed to fetch project boards');
      return response.json();
    },
    enabled: !!board.projectId
  });

  // Update board function
  const updateBoard = (updatedBoard: Board) => {
    onBoardChange(updatedBoard);
  };

  // Add keyboard event listeners for modifier keys (Cmd/Ctrl) and undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for different modifier combinations
      const cmdPressed = e.metaKey || e.ctrlKey;
      const ctrlPressed = e.ctrlKey;
      
      // Cmd+Ctrl = duplicate mode
      if (cmdPressed && ctrlPressed) {
        setIsDuplicateMode(true);
        setIsModifierKeyPressed(true);
      }
      // Just Cmd = move mode
      else if (cmdPressed) {
        setIsModifierKeyPressed(true);
        setIsDuplicateMode(false);
      }
      
      // Space key for horizontal scroll mode - exclude input fields and contentEditable elements
      if (e.code === 'Space' && 
          !(e.target instanceof HTMLInputElement) && 
          !(e.target instanceof HTMLTextAreaElement) &&
          !(e.target as HTMLElement)?.contentEditable === 'true') {
        e.preventDefault();
        setSpacePressed(true);
      }

      // Handle Cmd-Z / Ctrl-Z for undo
      if (cmdPressed && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (undoHistory.length > 0) {
          const lastState = undoHistory[undoHistory.length - 1];
          onBlocksChange(lastState.blocks);
          setUndoHistory(prev => prev.slice(0, -1));
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      // Reset when any modifier key is released
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsModifierKeyPressed(false);
        setIsDuplicateMode(false);
      }
      
      // Reset spacebar pressed state
      if (e.code === 'Space') {
        setSpacePressed(false);
        setIsDragging(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [undoHistory, onBlocksChange]);

  const {
    data: boardFromQuery,
    isLoading: boardLoading,
    error,
  } = useQuery({
    queryKey: ["/api/boards", id],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${id}`);
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(
            "Too many requests. Please wait a moment before trying again.",
          );
        }
        throw new Error("Failed to fetch board");
      }
      return res.json();
    },
    refetchInterval: 60000, // Reduced from 5s to 60s for rate limiting
    retry: (failureCount, error) => {
      if (
        error instanceof Error &&
        error.message.includes("Too many requests")
      ) {
        return false;
      }
      return failureCount < 3;
    },
    gcTime: 1000 * 60 * 5,
  });

  // Project data is now passed as a prop from the parent component

  if (boardLoading || !board) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading project...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-2">{error.message}</div>
          <div className="text-sm text-gray-600">
            Please wait a moment and try again
          </div>
        </div>
      </div>
    );
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) {
      setIsDragActive(false);
      return;
    }
    
    // Clear any pending drag timeout
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    
    // Set drag active to prevent conflicting updates
    setIsDragActive(true);
    
    // Clear drag state after operation completes
    dragTimeoutRef.current = setTimeout(() => {
      setIsDragActive(false);
    }, 100);

    const { source, destination, type } = result;
    
    // Handle COLUMN type drags
    if (type === "COLUMN") {
      const sourcePhaseIndex = Number(source.droppableId.split("-")[1]);
      const destPhaseIndex = Number(destination.droppableId.split("-")[1]);

      const newPhases = Array.from(board.phases);
      const sourcePhase = newPhases[sourcePhaseIndex];
      const destPhase = newPhases[destPhaseIndex];

      const [movedColumn] = sourcePhase.columns.splice(source.index, 1);
      destPhase.columns.splice(destination.index, 0, movedColumn);

      const blocks = structuredClone(board.blocks);
      blocks.forEach((block) => {
        if (
          block.phaseIndex === sourcePhaseIndex &&
          block.columnIndex === source.index
        ) {
          block.phaseIndex = destPhaseIndex;
          block.columnIndex = destination.index;
        } else {
          if (
            block.phaseIndex === sourcePhaseIndex &&
            block.columnIndex > source.index
          ) {
            block.columnIndex--;
          }
          if (
            block.phaseIndex === destPhaseIndex &&
            block.columnIndex >= destination.index
          ) {
            block.columnIndex++;
          }
        }
      });

      onPhasesChange(newPhases);
      onBlocksChange(blocks);
      return;
    }
    
    // Handle BLOCK type drags
    if (type === "BLOCK") {
      let blocks = structuredClone(board.blocks);
      
      // Handle dropping block in drawer (delete)
      if (destination.droppableId === "drawer") {
        blocks = blocks.filter((b) => b.id !== result.draggableId);
        onBlocksChange(blocks);
        return;
      }
      
      // Handle dragging from drawer (create new)
      if (source.droppableId === "drawer") {
        const blockType = result.draggableId.replace("drawer-", "");
        const [phaseIndex, columnIndex] = destination.droppableId
          .split("-")
          .map(Number);

        // Set default content for divider blocks based on their type
        let defaultContent = "";
        if (blockType === "front-stage") {
          defaultContent = "Front-Stage";
        } else if (blockType === "back-stage") {
          defaultContent = "Back-Stage";
        } else if (blockType === "custom-divider") {
          defaultContent = "Custom Divider";
        }

        const newBlock: BlockType = {
          id: nanoid(),
          type: blockType as BlockType["type"],
          content: defaultContent,
          phaseIndex,
          columnIndex,
          comments: [],
          attachments: [],
          notes: "",
          emoji: "",
          department: undefined,
          customDepartment: "",
          isDivider: false,
          flagged: false,
        };

        // Get blocks in destination column to determine insertion point
        const blocksInDestColumn = blocks
          .filter(
            (b) => b.phaseIndex === phaseIndex && b.columnIndex === columnIndex,
          )
          .sort((a, b) => blocks.indexOf(a) - blocks.indexOf(b));

        // Find the correct insertion index
        const insertIndex =
          destination.index === 0
            ? blocks.findIndex(
                (b) =>
                  b.phaseIndex === phaseIndex && b.columnIndex === columnIndex,
              )
            : blocks.findIndex(
                (b) => b === blocksInDestColumn[destination.index - 1],
              ) + 1;

        if (insertIndex === -1) {
          blocks.push(newBlock);
        } else {
          blocks.splice(insertIndex, 0, newBlock);
        }

        onBlocksChange(blocks);
        return;
      }
      
      // Handle block duplication on Cmd+Ctrl
      if (isDuplicateMode) {
        const [sourcePhase, sourceColumn] = source.droppableId.split("-").map(Number);
        const [destPhase, destColumn] = destination.droppableId.split("-").map(Number);
      
        // Get ordered blocks in source column
        const blocksInSourceColumn = blocks
          .filter(b => b.phaseIndex === sourcePhase && b.columnIndex === sourceColumn)
          .sort((a, b) => blocks.indexOf(a) - blocks.indexOf(b));
      
        // Find the block to duplicate
        const blockToDuplicate = blocksInSourceColumn[source.index];
        if (!blockToDuplicate) return;
      
        // Create a duplicate with a new ID
        const duplicatedBlock = {
          ...blockToDuplicate,
          id: nanoid(),
          phaseIndex: destPhase,
          columnIndex: destColumn
        };
      
        // Get blocks in destination column to determine insertion point
        const blocksInDestColumn = blocks
          .filter(b => b.phaseIndex === destPhase && b.columnIndex === destColumn)
          .sort((a, b) => blocks.indexOf(a) - blocks.indexOf(b));
      
        // Find the insertion index
        const insertIndex = destination.index === 0
          ? blocks.findIndex(b => b.phaseIndex === destPhase && b.columnIndex === destColumn)
          : blocks.findIndex(b => b === blocksInDestColumn[destination.index - 1]) + 1;
      
        // Insert the duplicated block
        if (insertIndex === -1) {
          blocks.push(duplicatedBlock);
        } else {
          blocks.splice(insertIndex, 0, duplicatedBlock);
        }
      
        onBlocksChange(blocks);
        return;
      }
      
      // Handle moving an existing block
      const [sourcePhase, sourceColumn] = source.droppableId.split("-").map(Number);
      const [destPhase, destColumn] = destination.droppableId.split("-").map(Number);
    
      // Get ordered blocks in source column
      const blocksInSourceColumn = blocks
        .filter(b => b.phaseIndex === sourcePhase && b.columnIndex === sourceColumn)
        .sort((a, b) => blocks.indexOf(a) - blocks.indexOf(b));
    
      // Find the block to move
      const blockToMove = blocksInSourceColumn[source.index];
      if (!blockToMove) return;
    
      // Remove the block from its current position
      blocks = blocks.filter(b => b.id !== blockToMove.id);
    
      // Update the block's position
      blockToMove.phaseIndex = destPhase;
      blockToMove.columnIndex = destColumn;
    
      // Get blocks in destination column to determine insertion point
      const blocksInDestColumn = blocks
        .filter(b => b.phaseIndex === destPhase && b.columnIndex === destColumn)
        .sort((a, b) => blocks.indexOf(a) - blocks.indexOf(b));
    
      // Find the insertion index
      const insertIndex = destination.index === 0
        ? blocks.findIndex(b => b.phaseIndex === destPhase && b.columnIndex === destColumn)
        : blocks.findIndex(b => b === blocksInDestColumn[destination.index - 1]) + 1;
    
      // Insert the block at its new position
      if (insertIndex === -1) {
        blocks.push(blockToMove);
      } else {
        blocks.splice(insertIndex, 0, blockToMove);
      }
    
      onBlocksChange(blocks);
      return;
    }

    // Show warning for unexpected drag types
    console.warn(`Unhandled drag type: ${type || "DEFAULT"}`);
  };

  const handleBlockChange = (blockId: string, content: string, newType?: string) => {
    const blocks = structuredClone(board.blocks).map((block) =>
      block.id === blockId 
        ? { 
            ...block, 
            content: content,
            ...(newType ? { type: newType } : {})
          } 
        : block,
    );
    onBlocksChange(blocks);
  };

  // Quick block creation handler
  const handleQuickBlockCreation = (phaseIndex: number, columnIndex: number, blockType: string) => {
    const newBlock: BlockType = {
      id: nanoid(),
      type: blockType as any,
      content: '',
      phaseIndex,
      columnIndex,
      emoji: '',
      notes: '',
      comments: [],
      isDivider: false,
      attachments: [],
      customDepartment: '',
      experimentTarget: '',
      flagged: false
    };

    const updatedBlocks = [...board.blocks, newBlock];
    onBlocksChange(updatedBlocks);
    setShowBlockTypeMenu(null);
  };
  
  /**
   * Handle Google Sheets connection updates for a block
   */
  const handleSheetsConnectionChange = (blockId: string, connection: {
    sheetId: string;
    sheetName?: string;
    cellRange: string;
    label?: string;
    lastUpdated: string;
    formattedValue?: string; // Added to capture the value from Google Sheets
  }) => {
    const blocks = structuredClone(board.blocks).map((block) =>
      block.id === blockId 
        ? { 
            ...block, 
            sheetsConnection: connection,
            // Update the block content with the formatted value if available
            ...(connection.formattedValue ? { 
              content: connection.label 
                ? `${connection.label}: ${connection.formattedValue}`
                : connection.formattedValue
            } : {})
          } 
        : block,
    );
    onBlocksChange(blocks);
  };

  const handleAttachmentChange = useCallback((
    blockId: string,
    attachments: Attachment[],
  ) => {
    console.log(`[BoardGrid] handleAttachmentChange called for block ${blockId}`);
    console.log(`[BoardGrid] Attachments received:`, attachments);
    console.log(`[BoardGrid] Attachments type:`, typeof attachments);
    console.log(`[BoardGrid] Is array:`, Array.isArray(attachments));
    console.log(`[BoardGrid] Attachments length:`, attachments?.length);
    
    // Ensure attachments is always an array and validate structure
    const safeAttachments = Array.isArray(attachments) ? attachments.filter(att => 
      att && typeof att === 'object' && att.type && att.url
    ).map(att => ({
      ...att,
      id: att.id || `${att.url}-${Date.now()}` // Ensure each attachment has an ID
    })) : [];
    
    console.log(`[BoardGrid] Safe attachments processed:`, safeAttachments);
    console.log(`[BoardGrid] Safe attachments length:`, safeAttachments.length);
    
    const currentBlock = board.blocks.find(b => b.id === blockId);
    console.log(`[BoardGrid] Current block before update:`, currentBlock);
    
    const blocks = structuredClone(board.blocks).map((block) =>
      block.id === blockId ? { ...block, attachments: safeAttachments } : block,
    );
    
    const updatedBlock = blocks.find(b => b.id === blockId);
    console.log(`[BoardGrid] Updated block after update:`, updatedBlock);
    console.log(`[BoardGrid] Updated block attachments count:`, updatedBlock?.attachments?.length);
    
    console.log(`[BoardGrid] Calling onBlocksChange with ${blocks.length} blocks`);
    onBlocksChange(blocks);
    console.log(`[BoardGrid] onBlocksChange called successfully`);
  }, [board.blocks, onBlocksChange]);

  const handleNotesChange = (blockId: string, notes: string) => {
    const blocks = structuredClone(board.blocks).map((block) =>
      block.id === blockId ? { ...block, notes } : block,
    );
    onBlocksChange(blocks);
  };

  const handleEmojiChange = (blockId: string, emoji: string) => {
    const blocks = structuredClone(board.blocks).map((block) =>
      block.id === blockId ? { ...block, emoji } : block,
    );
    onBlocksChange(blocks);
  };

  const handleDepartmentChange = (
    blockId: string,
    department: Department | undefined,
    customDepartment?: string,
  ) => {
    const blocks = structuredClone(board.blocks).map((block) =>
      block.id === blockId ? { ...block, department, customDepartment } : block,
    );
    onBlocksChange(blocks);
  };

  const handleDeleteBlock = (blockId: string) => {
    // Save current state to undo history before deletion
    setUndoHistory(prev => [...prev.slice(-4), { action: 'delete', blocks: structuredClone(board.blocks) }]);
    
    const blocks = structuredClone(board.blocks).filter((block) => block.id !== blockId);
    onBlocksChange(blocks);
  };

  const handleAddColumn = (phaseIndex: number) => {
    const newPhases = [...board.phases];
    const newColumn = {
      id: nanoid(),
      name: `Step ${newPhases[phaseIndex].columns.length + 1}`,
      image: undefined,
    };

    newPhases[phaseIndex].columns.push(newColumn);
    onPhasesChange(newPhases);
  };

  const handleAddPhase = () => {
    const newPhases = [...board.phases];
    newPhases.push({
      id: nanoid(),
      name: `Phase ${newPhases.length + 1}`,
      collapsed: false,
      columns: [
        {
          id: nanoid(),
          name: "Step 1",
          image: undefined,
        },
      ],
    });

    onPhasesChange(newPhases);
  };

  const handlePhaseNameChange = (phaseIndex: number, name: string) => {
    const newPhases = [...board.phases];
    newPhases[phaseIndex].name = name;
    onPhasesChange(newPhases);
  };

  const togglePhaseCollapse = (phaseIndex: number) => {
    const newPhases = [...board.phases];
    newPhases[phaseIndex].collapsed = !newPhases[phaseIndex].collapsed;
    onPhasesChange(newPhases);
  };

  const handleImportBlueprint = (importedPhases: Phase[], importedBlocks: any[], placement: 'beginning' | 'end') => {
    // Handle phase placement
    const newPhases = placement === 'beginning' 
      ? [...importedPhases, ...board.phases]
      : [...board.phases, ...importedPhases];

    // Adjust block indices based on placement and existing phases
    const phaseOffset = placement === 'beginning' ? 0 : board.phases.length;
    const adjustedBlocks = importedBlocks.map(block => ({
      ...block,
      phaseIndex: block.phaseIndex + phaseOffset
    }));

    // Combine with existing blocks
    const newBlocks = [...board.blocks, ...adjustedBlocks];

    onPhasesChange(newPhases);
    onBlocksChange(newBlocks);
  };

  const handleDeletePhase = (phaseIndex: number) => {
    const newPhases = [...board.phases];
    newPhases.splice(phaseIndex, 1);
    
    // Update block phase indices
    const updatedBlocks = board.blocks.map(block => {
      if (block.phaseIndex === phaseIndex) {
        // Remove blocks from deleted phase
        return null;
      } else if (block.phaseIndex > phaseIndex) {
        // Shift blocks from later phases
        return { ...block, phaseIndex: block.phaseIndex - 1 };
      }
      return block;
    }).filter(Boolean) as BlockType[];
    
    onPhasesChange(newPhases);
    onBlocksChange(updatedBlocks);
  };

  const handleMovePhase = (phaseIndex: number, direction: 'left' | 'right') => {
    const newPhases = [...board.phases];
    const targetIndex = direction === 'left' ? phaseIndex - 1 : phaseIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= newPhases.length) return;
    
    // Swap phases
    [newPhases[phaseIndex], newPhases[targetIndex]] = [newPhases[targetIndex], newPhases[phaseIndex]];
    
    // Update block phase indices
    const updatedBlocks = board.blocks.map(block => {
      if (block.phaseIndex === phaseIndex) {
        return { ...block, phaseIndex: targetIndex };
      } else if (block.phaseIndex === targetIndex) {
        return { ...block, phaseIndex: phaseIndex };
      }
      return block;
    });
    
    onPhasesChange(newPhases);
    onBlocksChange(updatedBlocks);
  };

  const handleColumnNameChange = (
    phaseIndex: number,
    columnIndex: number,
    name: string,
  ) => {
    const newPhases = [...board.phases];
    newPhases[phaseIndex].columns[columnIndex].name = name;
    onPhasesChange(newPhases);
  };

  // Board name editing with mutation (same pattern as project name editing)
  const boardNameMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/boards/${board.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: editedBoardName }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update blueprint name');
      }
      
      return response.json();
    },
    onSuccess: (updatedBoard) => {
      setIsEditingName(false);
      onBoardChange(updatedBoard);
      toast({
        title: "Success",
        description: "Blueprint name updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBoardNameEdit = () => {
    if (isEditingName) {
      boardNameMutation.mutate();
    } else {
      setIsEditingName(true);
      setEditedBoardName(board.name);
    }
  };

  const handleBoardNameSave = () => {
    boardNameMutation.mutate();
  };

  const handleClose = () => {
    setLocation("/");
  };

  const handleImageChange = (
    phaseIndex: number,
    columnIndex: number,
    image: string | null,
  ) => {
    const newPhases = [...board.phases];
    const column = newPhases[phaseIndex].columns[columnIndex];
    
    if (image === null) {
      // When deleting, clear both regular image and storyboard data
      column.image = undefined;
      column.storyboardImageUrl = undefined;
      column.storyboardPrompt = undefined;
    } else {
      // When setting a new image, clear storyboard data and set regular image
      column.image = image;
      column.storyboardImageUrl = undefined;
      column.storyboardPrompt = undefined;
    }
    
    onPhasesChange(newPhases);
  };

  const handleEmotionChange = (
    phaseIndex: number,
    columnIndex: number,
    emotion: Emotion | null
  ) => {
    const newPhases = [...board.phases];
    const column = newPhases[phaseIndex].columns[columnIndex];
    
    if (emotion) {
      column.emotion = emotion;
    } else {
      column.emotion = undefined;
    }
    
    onPhasesChange(newPhases);
  };

  const handleStoryboardGenerated = (
    phaseIndex: number,
    columnIndex: number,
    imageUrl: string,
    prompt: string,
  ) => {
    console.log('[BOARD GRID] === STORYBOARD CALLBACK RECEIVED ===');
    console.log('[BOARD GRID] Phase:', phaseIndex, 'Column:', columnIndex);
    console.log('[BOARD GRID] Image URL:', imageUrl);
    console.log('[BOARD GRID] Prompt:', prompt);
    console.log('[BOARD GRID] Current board phases:', board.phases.length);
    
    const newPhases = [...board.phases];
    const targetColumn = newPhases[phaseIndex].columns[columnIndex];
    console.log('[BOARD GRID] Target column before update:', targetColumn);
    
    // Clear regular image and set storyboard data
    newPhases[phaseIndex].columns[columnIndex].image = undefined;
    newPhases[phaseIndex].columns[columnIndex].storyboardImageUrl = imageUrl;
    newPhases[phaseIndex].columns[columnIndex].storyboardPrompt = prompt;
    
    console.log('[BOARD GRID] Target column after update:', newPhases[phaseIndex].columns[columnIndex]);
    console.log('[BOARD GRID] Calling onPhasesChange with updated phases');
    
    onPhasesChange(newPhases);
  };

  const handleDeleteColumn = (phaseIndex: number, columnIndex: number) => {
    const newPhases = [...board.phases];
    newPhases[phaseIndex].columns.splice(columnIndex, 1);

    const newBlocks = board.blocks
      .filter(
        (block) =>
          !(
            block.phaseIndex === phaseIndex && block.columnIndex === columnIndex
          ),
      )
      .map((block) => {
        if (
          block.phaseIndex === phaseIndex &&
          block.columnIndex > columnIndex
        ) {
          return { ...block, columnIndex: block.columnIndex - 1 };
        }
        return block;
      });

    onPhasesChange(newPhases);
    onBlocksChange(newBlocks);
  };

  const handleCommentClick = (block: BlockType) => {
    setSelectedBlock(block);
    setCommentDialogOpen(true);
    setHighlightedBlockId(block.id);
    setTimeout(() => setHighlightedBlockId(null), 2000);
  };

  // Helper to close all sidebar sections
  const closeAllSections = () => {
    setShowContext(false);
    setShowBlocks(false);
    setShowComments(false);
    setShowDepartments(false);
    setShowGoogleSheets(false);
  };

  const toggleContext = () => {
    if (showContext) {
      setShowContext(false);
    } else {
      closeAllSections();
      setShowContext(true);
      if (!isDrawerOpen) {
        setIsDrawerOpen(true);
      }
    }
  };

  const toggleBlocks = () => {
    if (showBlocks) {
      setShowBlocks(false);
    } else {
      closeAllSections();
      setShowBlocks(true);
      if (!isDrawerOpen) {
        setIsDrawerOpen(true);
      }
    }
  };

  const toggleComments = () => {
    if (showComments) {
      setShowComments(false);
    } else {
      closeAllSections();
      setShowComments(true);
      if (!isDrawerOpen) {
        setIsDrawerOpen(true);
      }
    }
  };

  const toggleDepartments = () => {
    if (showDepartments) {
      setShowDepartments(false);
    } else {
      closeAllSections();
      setShowDepartments(true);
      if (!isDrawerOpen) {
        setIsDrawerOpen(true);
      }
    }
  };
  
  const toggleGoogleSheets = () => {
    if (showGoogleSheets) {
      setShowGoogleSheets(false);
    } else {
      closeAllSections();
      setShowGoogleSheets(true);
      if (!isDrawerOpen) {
        setIsDrawerOpen(true);
      }
    }
  };



  const toggleSidebar = () => {
    setIsDrawerOpen(!isDrawerOpen);
    if (!isDrawerOpen) {
      setShowComments(false);
      setShowBlocks(false);
      setShowDepartments(false);
      setShowGoogleSheets(false);
    }
  };

  const handleDeleteBoard = async () => {
    try {
      const res = await fetch(`/api/boards/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete blueprint");
      setLocation("/");
    } catch (error) {
      useToast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete blueprint",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = async () => {
    if (!boardRef.current) return;

    try {
      await exportToPDF(boardRef.current, board.name);
    } catch (error) {
      console.error("PDF export failed:", error);
      toast({
        title: "Export failed",
        description: "Failed to export the blueprint to PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const exportToPDF = async (boardElement: HTMLElement, boardName: string) => {
    try {
      // Hide interactive elements temporarily
      const hideElements = document.querySelectorAll('.hide-in-pdf, button[title*="Move"], button[title*="Delete"], button[title*="Collapse"], button[title*="Expand"], [role="toolbar"], .toolbar, button[title*="Add"], button[title*="Upload"], button[title*="Copy"], button[title*="Save"], .action-button, .block-toolbar');
      hideElements.forEach(el => {
        (el as HTMLElement).style.visibility = 'hidden';
      });

      // Create wrapper with title
      const wrapper = document.createElement('div');
      wrapper.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      wrapper.style.background = 'white';
      wrapper.style.padding = '20px';
      wrapper.style.position = 'absolute';
      wrapper.style.left = '-9999px';
      wrapper.style.top = '0';
      wrapper.style.width = 'max-content';

      // Add title
      const title = document.createElement('h1');
      title.textContent = boardName;
      title.style.fontFamily = '"EB Garamond", Georgia, serif';
      title.style.fontSize = '24px';
      title.style.fontWeight = '600';
      title.style.color = '#1f2937';
      title.style.marginBottom = '20px';
      title.style.marginTop = '0';
      wrapper.appendChild(title);

      // Clone the board content
      const clonedBoard = boardElement.cloneNode(true) as HTMLElement;
      wrapper.appendChild(clonedBoard);
      
      document.body.appendChild(wrapper);

      // Wait a moment for rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(wrapper, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          // Remove interactive elements from the cloned document
          const clonedHideElements = clonedDoc.querySelectorAll('.hide-in-pdf, button[title*="Move"], button[title*="Delete"], button[title*="Collapse"], button[title*="Expand"], [role="toolbar"], .toolbar, button[title*="Add"], button[title*="Upload"], button[title*="Copy"], button[title*="Save"], .action-button, .block-toolbar, button');
          clonedHideElements.forEach(el => el.remove());
          
          // Ensure all text is visible
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach(el => {
            const element = el as HTMLElement;
            if (element.style) {
              element.style.opacity = '1';
              element.style.visibility = 'visible';
            }
          });
        }
      });

      const pdf = new jsPDF('landscape', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const aspectRatio = canvas.width / canvas.height;
      let width = pdfWidth - 40;
      let height = width / aspectRatio;
      
      if (height > pdfHeight - 40) {
        height = pdfHeight - 40;
        width = height * aspectRatio;
      }
      
      const x = (pdfWidth - width) / 2;
      const y = (pdfHeight - height) / 2;

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, width, height);
      pdf.save(`${boardName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_blueprint.pdf`);

      toast({
        title: "Export successful",
        description: "Blueprint exported to PDF successfully!",
      });

      // Cleanup
      document.body.removeChild(wrapper);
      hideElements.forEach(el => {
        (el as HTMLElement).style.visibility = 'visible';
      });

    } catch (error) {
      console.error('PDF export error:', error);
      
      // Restore visibility if error occurs
      const hideElements = document.querySelectorAll('.hide-in-pdf, button[title*="Move"], button[title*="Delete"], button[title*="Collapse"], button[title*="Expand"]');
      hideElements.forEach(el => {
        (el as HTMLElement).style.visibility = 'visible';
      });
      
      throw error;
    }
  };

  // Helper function to sanitize text for PDF export
  const sanitizeTextForPDF = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/→/g, '>')
      .replace(/←/g, '<')
      .replace(/↑/g, '^')
      .replace(/↓/g, 'v')
      .replace(/"/g, '"')
      .replace(/"/g, '"')
      .replace(/'/g, "'")
      .replace(/'/g, "'")
      .replace(/–/g, '-')
      .replace(/—/g, '-')
      .replace(/…/g, '...')
      .replace(/[^\x00-\x7F]/g, '?'); // Replace any non-ASCII with ?
  };

  // Helper function to get block type color
  const getBlockTypeColor = (blockType: string): { r: number, g: number, b: number } => {
    const colorMap: Record<string, { r: number, g: number, b: number }> = {
      touchpoint: { r: 0.235, g: 0.51, b: 0.965 }, // blue-600
      email: { r: 0.392, g: 0.325, b: 0.804 }, // indigo-500
      pendo: { r: 0.024, g: 0.714, b: 0.831 }, // cyan-500
      role: { r: 0.063, g: 0.725, b: 0.506 }, // green-500
      process: { r: 0.925, g: 0.345, b: 0.612 }, // pink-500
      friction: { r: 0.937, g: 0.267, b: 0.267 }, // red-500
      policy: { r: 0.962, g: 0.553, b: 0.192 }, // orange-500
      technology: { r: 0.549, g: 0.361, b: 0.965 }, // purple-500
      rationale: { r: 0.235, g: 0.51, b: 0.965 }, // blue-500
      question: { r: 0.541, g: 0.235, b: 0.784 }, // violet-500
      note: { r: 0.024, g: 0.714, b: 0.831 }, // cyan-400
      opportunities: { r: 0.925, g: 0.769, b: 0.094 }, // yellow-500
      hypothesis: { r: 0.024, g: 0.765, b: 0.522 }, // emerald-500
      insight: { r: 0.784, g: 0.235, b: 0.631 }, // fuchsia-500
      metrics: { r: 0.086, g: 0.714, b: 0.675 }, // teal-500
      experiment: { r: 0.918, g: 0.643, b: 0.094 }, // amber-500
      video: { r: 0.882, g: 0.267, b: 0.373 }, // rose-500
      hidden: { r: 0.42, g: 0.467, b: 0.518 }, // gray-500
    };
    return colorMap[blockType] || { r: 0.42, g: 0.467, b: 0.518 }; // gray-500 default
  };

  // Helper function to get block type icon
  const getBlockTypeIcon = (blockType: string): string => {
    const iconMap: Record<string, string> = {
      touchpoint: '👆', // Finger pointing
      email: '✉️', // Mail envelope
      pendo: '📊', // Bar chart
      role: '👤', // User silhouette
      process: '⚙️', // Gear
      friction: '⚠️', // Warning sign
      policy: '📋', // Clipboard
      technology: '💻', // Computer
      rationale: '💭', // Thought bubble
      question: '❓', // Question mark
      note: '📝', // Memo
      opportunities: '🎯', // Target
      hypothesis: '🔬', // Microscope
      insight: '💡', // Light bulb
      metrics: '📈', // Chart increasing
      experiment: '🧪', // Test tube
      video: '▶️', // Play button
      hidden: '👁️', // Eye
    };
    return iconMap[blockType] || '●';
  };

  // Helper function to create a placeholder image for PDF
  const createPlaceholderImage = async (pdfDoc: any, text: string) => {
    try {
      // Create a simple colored rectangle as a placeholder
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return null;
      
      // Draw background
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, 400, 300);
      
      // Draw border
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, 400, 300);
      
      // Draw text
      ctx.fillStyle = '#666';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(text, 200, 150);
      
      // Convert to blob and embed
      return new Promise((resolve) => {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          
          const arrayBuffer = await blob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          try {
            const result = await pdfDoc.embedPng(uint8Array);
            resolve(result);
          } catch {
            resolve(null);
          }
        }, 'image/png');
      });
    } catch {
      return null;
    }
  };

  // Helper function to convert image URL to data URL through server proxy
  const getImageAsDataUrl = async (imageUrl: string): Promise<string | null> => {
    try {
      // Use our server as a proxy to bypass CSP restrictions
      const response = await fetch('/api/proxy-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl })
      });
      
      if (!response.ok) {
        console.log('[PDF PROXY] Failed to proxy image:', response.status);
        return null;
      }
      
      const data = await response.json();
      return data.dataUrl || null;
    } catch (error) {
      console.log('[PDF PROXY] Error proxying image:', error);
      return null;
    }
  };

  // Helper function to embed images in PDF with CSP-safe approach
  const embedImageInPDF = async (pdfDoc: any, imageUrl: string, fallbackText: string = 'Image') => {
    if (!imageUrl || typeof imageUrl !== 'string') {
      return await createPlaceholderImage(pdfDoc, fallbackText);
    }
    
    try {
      // Try to get the image through our server proxy to bypass CSP
      const dataUrl = await getImageAsDataUrl(imageUrl);
      
      if (!dataUrl) {
        console.log('[PDF EMBED] Failed to get image via proxy, creating placeholder');
        return await createPlaceholderImage(pdfDoc, fallbackText);
      }
      
      // Convert data URL to Uint8Array
      const base64Data = dataUrl.split(',')[1];
      const binaryString = atob(base64Data);
      const uint8Array = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }
      
      // Determine format from data URL prefix
      const isJpeg = dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg');
      const isPng = dataUrl.startsWith('data:image/png');
      
      if (isPng) {
        try {
          return await pdfDoc.embedPng(uint8Array);
        } catch (error: any) {
          console.log('[PDF EMBED] PNG embedding failed:', error?.message || error);
        }
      }
      
      if (isJpeg) {
        try {
          return await pdfDoc.embedJpg(uint8Array);
        } catch (error: any) {
          console.log('[PDF EMBED] JPG embedding failed:', error?.message || error);
        }
      }
      
      // Try both formats as fallback
      try {
        return await pdfDoc.embedPng(uint8Array);
      } catch {
        try {
          return await pdfDoc.embedJpg(uint8Array);
        } catch {
          return await createPlaceholderImage(pdfDoc, fallbackText);
        }
      }
    } catch (error: any) {
      console.log('[PDF EMBED] Error in embedImageInPDF:', error?.message || error);
      return await createPlaceholderImage(pdfDoc, fallbackText);
    }
  };

  // Presentation Mode Export Functions
  const exportPresentationToPDF = async () => {
    if (!presentationMode || allSteps.length === 0) {
      toast({
        title: "No content to export",
        description: "Please ensure you're in presentation mode with content available.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Starting PDF export for presentation mode');
      console.log('Number of steps:', allSteps.length);
      
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Pre-load all column images with detailed logging
      console.log('[PDF DEBUG] Starting image pre-loading for', allSteps.length, 'steps');
      
      const columnImages: { [key: string]: any } = {};
      for (let i = 0; i < allSteps.length; i++) {
        const step = allSteps[i];
        const fallbackText = `${step.phaseName}\n${step.columnName}`;
        
        console.log(`[PDF DEBUG] Step ${i + 1}:`, {
          phaseName: step.phaseName,
          columnName: step.columnName,
          columnImage: step.columnImage,
          columnImageType: typeof step.columnImage,
          columnImageLength: step.columnImage?.length,
          hasColumnImage: !!step.columnImage
        });
        
        if (step.columnImage) {
          console.log(`[PDF DEBUG] Attempting to embed real image for step ${i + 1}: ${step.columnImage}`);
          const embeddedImage = await embedImageInPDF(pdfDoc, step.columnImage, fallbackText);
          if (embeddedImage) {
            console.log(`[PDF DEBUG] Successfully embedded real image for step ${i + 1}`);
            columnImages[step.columnImage] = embeddedImage;
          } else {
            console.log(`[PDF DEBUG] Failed to embed real image for step ${i + 1}, creating placeholder`);
            const placeholderImage = await createPlaceholderImage(pdfDoc, fallbackText);
            if (placeholderImage) {
              columnImages[`placeholder_${i}`] = placeholderImage;
            }
          }
        } else {
          console.log(`[PDF DEBUG] No column image for step ${i + 1}, creating placeholder`);
          // Create placeholder for steps without images
          const placeholderImage = await createPlaceholderImage(pdfDoc, fallbackText);
          if (placeholderImage) {
            columnImages[`placeholder_${i}`] = placeholderImage;
          }
        }
      }
      
      console.log('[PDF DEBUG] Final columnImages object keys:', Object.keys(columnImages));
      console.log('[PDF DEBUG] Total images loaded:', Object.keys(columnImages).length);

      // Create a page for each step
      for (let i = 0; i < allSteps.length; i++) {
        const step = allSteps[i];
        console.log(`Processing step ${i + 1}: ${step.phaseName} → ${step.columnName}`);
        
        const page = pdfDoc.addPage([612, 792]); // Letter size
        const { width, height } = page.getSize();
        
        // Title
        page.drawText(sanitizeTextForPDF(board.name || 'Untitled Board'), {
          x: 50,
          y: height - 50,
          size: 20,
          font: boldFont,
          color: rgb(0, 0, 0),
        });

        // Step info - Replace arrow with ASCII-safe character
        page.drawText(sanitizeTextForPDF(`${step.phaseName} > ${step.columnName}`), {
          x: 50,
          y: height - 80,
          size: 14,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });

        page.drawText(`Step ${i + 1} of ${allSteps.length}`, {
          x: 50,
          y: height - 100,
          size: 12,
          font,
          color: rgb(0.6, 0.6, 0.6),
        });

        // Add column header image if available
        let yPosition = height - 140;
        // Determine which image to use (real or placeholder)
        let embeddedImage = null;
        if (step.columnImage && columnImages[step.columnImage]) {
          embeddedImage = columnImages[step.columnImage];
        } else if (columnImages[`placeholder_${i}`]) {
          embeddedImage = columnImages[`placeholder_${i}`];
        }
        
        if (embeddedImage) {
          // Scale image to fit nicely in the PDF (similar to presentation mode)
          const imageDims = embeddedImage.scale(0.5);
          const maxWidth = 300;
          const maxHeight = 200;
          
          let imageWidth = imageDims.width;
          let imageHeight = imageDims.height;
          
          // Maintain aspect ratio while fitting within max dimensions
          if (imageWidth > maxWidth) {
            imageHeight = (imageHeight * maxWidth) / imageWidth;
            imageWidth = maxWidth;
          }
          if (imageHeight > maxHeight) {
            imageWidth = (imageWidth * maxHeight) / imageHeight;
            imageHeight = maxHeight;
          }
          
          // Center the image horizontally
          const imageX = (width - imageWidth) / 2;
          
          page.drawImage(embeddedImage, {
            x: imageX,
            y: yPosition - imageHeight,
            width: imageWidth,
            height: imageHeight,
          });
          
          yPosition -= imageHeight + 30; // Move content down after image
        }

        // Blocks content
        console.log(`Step ${i + 1} has ${step.blocks.length} blocks`);
        
        if (step.blocks.length === 0) {
          page.drawText('No blocks in this step', {
            x: 50,
            y: yPosition,
            size: 12,
            font,
            color: rgb(0.5, 0.5, 0.5),
          });
        } else {
          step.blocks.forEach((block, blockIndex) => {
            if (yPosition < 100) return; // Skip if we're running out of space

            // Block type/department with visual elements
            const blockTitle = block.department || block.customDepartment || block.type || 'Unknown';
            const blockColor = getBlockTypeColor(block.type);
            
            // Draw colored rectangle as visual indicator
            page.drawRectangle({
              x: 45,
              y: yPosition - 3,
              width: 8,
              height: 14,
              color: rgb(blockColor.r, blockColor.g, blockColor.b),
            });
            
            // Draw block title (no icons)
            page.drawText(sanitizeTextForPDF(blockTitle), {
              x: 60,
              y: yPosition,
              size: 12,
              font: boldFont,
              color: rgb(0, 0, 0),
            });
            yPosition -= 20;

            // Block content
            if (block.content && block.content.trim()) {
              const lines = block.content.split('\n');
              lines.forEach((line) => {
                if (yPosition < 100) return;
                const truncatedLine = line.length > 80 ? line.substring(0, 77) + '...' : line;
                page.drawText(sanitizeTextForPDF(truncatedLine), {
                  x: 80,
                  y: yPosition,
                  size: 10,
                  font,
                  color: rgb(0.2, 0.2, 0.2),
                });
                yPosition -= 15;
              });
            } else {
              page.drawText('(No content)', {
                x: 80,
                y: yPosition,
                size: 10,
                font,
                color: rgb(0.5, 0.5, 0.5),
              });
              yPosition -= 15;
            }

            // Display and embed image attachments if any
            if (block.attachments && Array.isArray(block.attachments) && block.attachments.length > 0) {
              const imageAttachments = block.attachments.filter(att => 
                att && att.type === 'image' && att.url
              );
              
              if (imageAttachments.length > 0) {
                page.drawText(`Images (${imageAttachments.length}):`, {
                  x: 80,
                  y: yPosition,
                  size: 9,
                  font: boldFont,
                  color: rgb(0.4, 0.4, 0.4),
                });
                yPosition -= 12;
                
                // List block attachment images
                imageAttachments.forEach((attachment, idx) => {
                  if (yPosition < 100) return;
                  const imageName = attachment.title || `Image ${idx + 1}`;
                  page.drawText(`• ${sanitizeTextForPDF(imageName)}`, {
                    x: 90,
                    y: yPosition,
                    size: 8,
                    font,
                    color: rgb(0.3, 0.3, 0.3),
                  });
                  yPosition -= 12;
                });
              }
            }

            // Display block emoji if present
            if (block.emoji) {
              page.drawText(`Emoji: ${sanitizeTextForPDF(block.emoji)}`, {
                x: 80,
                y: yPosition,
                size: 8,
                font,
                color: rgb(0.4, 0.4, 0.4),
              });
              yPosition -= 12;
            }

            yPosition -= 10; // Space between blocks
          });
        }
      }

      // Add notes as final page if they exist
      if (presentationNotes && presentationNotes.trim()) {
        console.log('Adding notes page');
        const notesPage = pdfDoc.addPage([612, 792]);
        const { width, height } = notesPage.getSize();
        
        notesPage.drawText('Presentation Notes', {
          x: 50,
          y: height - 50,
          size: 18,
          font: boldFont,
          color: rgb(0, 0, 0),
        });

        const noteLines = presentationNotes.split('\n');
        let yPos = height - 90;
        noteLines.forEach((line) => {
          if (yPos < 50) return;
          const truncatedLine = line.length > 80 ? line.substring(0, 77) + '...' : line;
          notesPage.drawText(sanitizeTextForPDF(truncatedLine), {
            x: 50,
            y: yPos,
            size: 11,
            font,
            color: rgb(0.2, 0.2, 0.2),
          });
          yPos -= 18;
        });
      }

      console.log('Generating PDF bytes...');
      const pdfBytes = await pdfDoc.save();
      
      console.log('Creating download...');
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(board.name || 'presentation').replace(/[^a-z0-9]/gi, "_").toLowerCase()}_presentation.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('PDF export completed successfully');
      toast({
        title: "Export successful",
        description: "Presentation exported to PDF successfully!",
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "Export failed",
        description: `Failed to export presentation to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  // Google Slides Export Function
  const exportPresentationToSlides = async () => {
    console.log('[DEBUG] exportPresentationToSlides called');
    console.log('[DEBUG] presentationMode:', presentationMode);
    console.log('[DEBUG] allSteps.length:', allSteps.length);
    
    if (!presentationMode || allSteps.length === 0) {
      console.log('[DEBUG] Export validation failed - no content');
      toast({
        title: "No content to export",
        description: "Please ensure you're in presentation mode with content available.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('[DEBUG] Starting Google Slides export for presentation mode');
      
      // Prepare the presentation data
      const presentationData = {
        title: `${board.name || 'Untitled Board'} - Presentation`,
        slides: allSteps.map((step, index) => ({
          title: `${step.phaseName} - ${step.columnName}`,
          stepNumber: index + 1,
          totalSteps: allSteps.length,
          columnImage: step.columnImage,
          blocks: step.blocks.map(block => ({
            type: block.type,
            content: block.content,
            icon: getBlockTypeIcon(block.type),
            color: getBlockTypeColor(block.type)
          })),
          notes: presentationNotes
        }))
      };

      console.log('Sending presentation data to Google Slides API');
      
      const response = await fetch('/api/export-to-slides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(presentationData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export to Google Slides');
      }

      const result = await response.json();
      
      console.log('Google Slides export completed successfully');
      
      if (result.presentationUrl) {
        // Check if this is a mock presentation ID (starts with "1" and has 44 chars)
        if (result.presentationUrl.includes('/d/1') && result.presentationUrl.length > 50) {
          // Real Google Slides URL
          window.open(result.presentationUrl, '_blank');
          toast({
            title: "Export successful",
            description: "Presentation exported to Google Slides successfully!",
          });
        } else {
          // Mock/demo response
          toast({
            title: "Google Slides Export Setup Required",
            description: "To create actual Google Slides presentations, OAuth authentication is needed. Currently showing demo functionality.",
          });
        }
      } else {
        throw new Error('No presentation URL returned');
      }
      
    } catch (error) {
      console.error('Google Slides export error:', error);
      toast({
        title: "Export failed",
        description: `Failed to export presentation to Google Slides: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const exportNotesToText = () => {
    const content = `${board.name} - Presentation Notes\n${'='.repeat(40)}\n\n${presentationNotes || 'No notes available.'}\n\nGenerated on: ${new Date().toLocaleString()}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${board.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_notes.txt`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Notes exported to text file successfully!",
    });
  };

  const exportToGoogleSlides = async () => {
    try {
      // Create Google Slides presentation
      const slidesData = {
        title: `${board.name} - Presentation`,
        slides: allSteps.map((step, index) => ({
          title: `${step.phaseName} → ${step.columnName}`,
          content: step.blocks.map(block => ({
            type: block.department || block.customDepartment || block.type,
            content: block.content || '',
            notes: block.notes || ''
          })),
          stepNumber: index + 1,
          totalSteps: allSteps.length
        })),
        notes: presentationNotes
      };

      const response = await fetch('/api/export/google-slides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slidesData),
      });

      if (!response.ok) {
        throw new Error('Failed to create Google Slides presentation');
      }

      const result = await response.json();
      window.open(result.presentationUrl, '_blank');

      toast({
        title: "Export successful",
        description: "Presentation exported to Google Slides successfully!",
      });
    } catch (error) {
      console.error('Google Slides export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export to Google Slides. Please try again.",
        variant: "destructive",
      });
    }
  };

  const exportToGoogleDocs = async () => {
    try {
      // Create Google Docs document
      const docsData = {
        title: `${board.name} - Presentation`,
        slides: allSteps.map((step, index) => ({
          title: `${step.phaseName} → ${step.columnName}`,
          content: step.blocks.map(block => ({
            type: block.department || block.customDepartment || block.type,
            content: block.content || '',
            notes: block.notes || ''
          })),
          stepNumber: index + 1,
          totalSteps: allSteps.length
        })),
        notes: presentationNotes
      };

      const response = await fetch('/api/export/google-docs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(docsData),
      });

      if (!response.ok) {
        throw new Error('Failed to create Google Docs document');
      }

      const result = await response.json();
      window.open(result.documentUrl, '_blank');

      toast({
        title: "Export successful",
        description: "Presentation exported to Google Docs successfully!",
      });
    } catch (error) {
      console.error('Google Docs export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export to Google Docs. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Add keyboard event listeners for modifier key detection (Cmd/Ctrl)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Command (Mac) or Control (Windows/Linux) key is pressed
      if (e.metaKey || e.ctrlKey) {
        setIsModifierKeyPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // When the modifier key is released, reset the state
      if (e.key === 'Meta' || e.key === 'Control') {
        setIsModifierKeyPressed(false);
      }
    };

    // Add event listeners when component mounts
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Clean up event listeners when component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Add a function to handle the drag start event for potential duplication
  const handleDragStart = (initial: any) => {
    // We only need to show a visual indicator if modifier is pressed
    if (isModifierKeyPressed) {
      // Could add some visual indication here that we're in duplicate mode
      // For example, changing the cursor or adding a badge
    }
  };

  // Bulk edit functions
  const handleBulkDelete = () => {
    const blocksToDelete = Array.from(selectedBlocks);
    const newBlocks = board.blocks.filter(block => !selectedBlocks.has(block.id));
    
    // Save to undo history
    setUndoHistory(prev => [...prev, {action: 'bulk delete', blocks: board.blocks}]);
    
    onBlocksChange(newBlocks);
    setSelectedBlocks(new Set());
    
    toast({
      title: "Blocks deleted",
      description: `Deleted ${blocksToDelete.length} blocks`,
    });
  };

  const handleClearAllEmojis = () => {
    // Save to undo history
    setUndoHistory(prev => [...prev, {action: 'clear emojis', blocks: board.blocks}]);
    
    const updatedBlocks = board.blocks.map(block => ({
      ...block,
      emoji: ''
    }));
    
    onBlocksChange(updatedBlocks);
    
    toast({
      title: "Emojis cleared",
      description: `Removed emojis from all blocks`,
    });
  };

  const toggleBlockSelection = (blockId: string) => {
    setSelectedBlocks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(blockId)) {
        newSet.delete(blockId);
      } else {
        newSet.add(blockId);
      }
      return newSet;
    });
  };

  return (
    <div className={`flex-1 relative overflow-hidden flex flex-col bauhaus-halftone-bg ${darkMode ? 'dark' : ''}`}>
      <header className={`h-20 border-b-4 px-8 flex justify-between items-center shadow-none flex-shrink-0 sticky top-0 left-0 right-0 z-50 ${
        darkMode ? 'bg-black border-[#FFD600]' : 'bg-[#0A0A0F] border-[#0A0A0F]'
      }`}>
        <div className="flex items-center gap-4 pl-4">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="h-9 px-3 text-xs text-white hover:text-[#FFD600] hover:bg-white/10"
          >
            <Home className="w-5 h-5 mr-2" />
            HOME
          </Button>

          {projectData && (
            <>
              <div className="w-px h-6 bg-white/30 mx-2" />
              <Button asChild variant="ghost" className="h-9 px-3 text-xs text-white hover:text-[#FFD600] hover:bg-white/10">
                <Link href={`/project/${projectData.id}`}>
                  <div className="flex items-center">
                    <Folder className="w-5 h-5 mr-2" />
                    {projectData.name}
                  </div>
                </Link>
              </Button>
            </>
          )}

          <div className="w-px h-6 bg-white/30 mx-2" />

          <div className="flex items-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedBoardName}
                  onChange={(e) => setEditedBoardName(e.target.value)}
                  className="h-10 bg-white text-[#0A0A0F] border-2 border-[#FFD600] rounded-none font-black uppercase tracking-widest focus-visible:ring-0 w-64"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleBoardNameSave();
                    } else if (e.key === 'Escape') {
                      setIsEditingName(false);
                      setEditedBoardName(board.name);
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleBoardNameSave}
                  className="bg-[#FFD600] text-[#0A0A0F] hover:bg-[#FFD600]/80 rounded-none border-2 border-[#0A0A0F] font-bold"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditingName(false);
                    setEditedBoardName(board.name);
                  }}
                  className="text-white hover:text-[#FFD600] hover:bg-white/10 rounded-none border-2 border-transparent font-bold"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <h1 className="text-xl font-black uppercase tracking-widest text-white cursor-pointer hover:text-[#FFD600] transition-colors" onClick={handleBoardNameEdit}>
                {board.name}
              </h1>
            )}
          </div>

          <div className="w-px h-6 bg-gray-200 mx-2" />
          
          {/* Bulk Edit Operations (when active) */}
          {bulkEditMode && selectedBlocks.size > 0 && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedBlocks.size} selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="h-9 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {/* TODO: bulk change type */}}
                  className="h-9"
                >
                  Change Type
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {/* TODO: bulk change department */}}
                  className="h-9"
                >
                  Change Label
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAllEmojis}
                  className="h-9 text-blue-600 hover:text-blue-700"
                >
                  Clear All Emojis
                </Button>
              </div>
              <div className="w-px h-6 bg-gray-200 mx-2" />
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <UsersPresence users={connectedUsers} />
          <div className="w-px h-6 bg-white/30 mx-2" />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setBulkEditMode(!bulkEditMode);
                setSelectedBlocks(new Set());
              }}
              className={`h-9 w-9 p-0 ${bulkEditMode ? 'text-[#FFD600]' : 'text-white/90 hover:text-white hover:bg-white/10'}`}
              title={bulkEditMode ? "Exit Bulk Edit" : "Bulk Edit"}
            >
              <LayoutGrid className="w-5 h-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEmotionJourney(!showEmotionJourney)}
              className={`h-9 w-9 p-0 ${showEmotionJourney ? 'text-[#FFD600]' : 'text-white/90 hover:text-white hover:bg-white/10'}`}
              title="Toggle Emotional Journey"
            >
              <TrendingUp className="w-5 h-5" />
            </Button>
            
            <div className="w-px h-6 bg-white/30 mx-2" />
            
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => setPresentationMode(true)} 
              className="h-9 w-9 p-0 text-white/90 hover:text-white hover:bg-white/10"
              title="Presentation Mode"
            >
              <Presentation className="w-5 h-5" />
            </Button>

            <Button 
              variant="ghost"
              size="sm"
              onClick={() => setShareLinkOpen(true)} 
              className="h-9 w-9 p-0 text-white/90 hover:text-white hover:bg-white/10"
              title="Share"
            >
              <ExternalLink className="w-5 h-5" />
            </Button>

            <div className="w-px h-6 bg-white/30 mx-2" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-white/90 hover:text-white hover:bg-white/10"
                  title="View Options"
                >
                  <Eye className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem 
                  onSelect={() => setGroupBlocksByType(!groupBlocksByType)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <Layers className="w-4 h-4 mr-2" />
                    <span>Stacked Mode</span>
                  </div>
                  {groupBlocksByType && <Check className="w-4 h-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onSelect={() => setBoardViewMode(boardViewMode === 'normal' ? 'condensed' : 'normal')}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <Minimize2 className="w-4 h-4 mr-2" />
                    <span>Condensed View</span>
                  </div>
                  {boardViewMode === 'condensed' && <Check className="w-4 h-4" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onSelect={() => setDarkMode(!darkMode)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center">
                    {darkMode ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                    <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                  </div>
                  {darkMode && <Check className="w-4 h-4" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-white/90 hover:text-white hover:bg-white/10"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAddToProjectOpen(true)}
              className="h-9 w-9 p-0 text-white/90 hover:text-white hover:bg-white/10"
              title="Add to Project"
            >
              <FolderPlus className="w-5 h-5" />
            </Button>

            <BlueprintImportTrigger 
              onImport={handleImportBlueprint}
              currentBoardId={board.id}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-white/90 hover:text-white hover:bg-white/10"
                  title="Export & Share"
                >
                  <ArrowUpFromLine className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={() => setInviteOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Team Members
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setShareLinkOpen(true)}>
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Generate Share Link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleExportPDF}>
                  <FileDown className="w-4 h-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-6 bg-white/30 mx-2" />
            
            <NotificationBell variant="light" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-white/90 hover:text-white hover:bg-white/10">
                  <ProfileIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem 
                  onClick={() => setProfileModalOpen(true)}
                  className="cursor-pointer"
                >
                  <User className="w-4 h-4 mr-2" />
                  Profile Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                  title="Delete Blueprint"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Blueprint</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this blueprint? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteBoard}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative pt-0.5">
        <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div
            className={`${isDrawerOpen ? "w-72" : "w-16"} flex-shrink-0 shadow-md transition-all duration-300 ease-in-out fixed top-20 left-0 bottom-0 z-40 h-auto flex flex-col overflow-y-auto`}
            style={{
              backgroundColor: darkMode ? '#1e1e32' : 'white',
              borderRight: darkMode ? '2px solid #3a3a5c' : '3px solid #0A0A0F'
            }}
          >
            <div className="flex flex-col flex-grow overflow-hidden relative">
              {/* Always present toggle button in line with navigation */}
              <div 
                className="shadow-sm py-0"
                style={{
                  backgroundColor: darkMode ? '#1e1e32' : 'white',
                  borderBottom: darkMode ? '1px solid #3a3a5c' : '1px solid #e5e7eb'
                }}
              >
                <div className="h-12 flex items-center justify-end pr-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSidebar}
                    className={`w-7 h-7 rounded-none bg-white border-2 border-[#0A0A0F] shadow-[2px_2px_0px_0px_#FFD600] hover:bg-[#FFD600] hover:shadow-none flex items-center justify-center p-0 transition-all ${darkMode ? "border-[#3a3a5c] shadow-[#FFD600]" : ""}`}
                  >
                    {isDrawerOpen ? (
                      <ChevronLeft className="w-4 h-4 text-[#0A0A0F] stroke-[3]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#0A0A0F] stroke-[3]" />
                    )}
                  </Button>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleContext}
                  className={`
                    w-full h-12 px-4 rounded-none
                    flex items-center gap-2
                    border-b-2 border-[#0A0A0F]
                    group
                    ${!isDrawerOpen ? "justify-center" : "justify-start"}
                    ${showContext ? "bg-[#FFD600] text-[#0A0A0F] font-bold" : (darkMode ? "bg-transparent text-white hover:bg-[#FFD600] hover:text-[#0A0A0F]" : "bg-white text-[#0A0A0F] hover:bg-[#FFD600]")}
                  `}
                >
                  <Info className={`w-5 h-5 ${showContext ? "text-[#0A0A0F]" : (darkMode ? "text-white group-hover:text-[#0A0A0F]" : "text-[#0A0A0F]")}`} />
                  {isDrawerOpen && <span className="text-sm font-semibold uppercase tracking-wide">Context</span>}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleBlocks}
                  className={`
                    w-full h-12 px-4 rounded-none
                    flex items-center gap-2
                    border-b-2 border-[#0A0A0F]
                    group
                    ${!isDrawerOpen ? "justify-center" : "justify-start"}
                    ${showBlocks ? "bg-[#FFD600] text-[#0A0A0F] font-bold" : (darkMode ? "bg-transparent text-white hover:bg-[#FFD600] hover:text-[#0A0A0F]" : "bg-white text-[#0A0A0F] hover:bg-[#FFD600]")}
                  `}
                >
                  <LayoutGrid className={`w-5 h-5 ${showBlocks ? "text-[#0A0A0F]" : (darkMode ? "text-white group-hover:text-[#0A0A0F]" : "text-[#0A0A0F]")}`} />
                  {isDrawerOpen && (
                    <span className="text-sm font-semibold uppercase tracking-wide">Blocks</span>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleComments}
                  className={`
                    w-full h-12 px-4 rounded-none
                    flex items-center gap-2
                    border-b-2 border-[#0A0A0F]
                    group
                    ${!isDrawerOpen ? "justify-center" : "justify-start"}
                    ${showComments ? "bg-[#FFD600] text-[#0A0A0F] font-bold" : (darkMode ? "bg-transparent text-white hover:bg-[#FFD600] hover:text-[#0A0A0F]" : "bg-white text-[#0A0A0F] hover:bg-[#FFD600]")}
                  `}
                >
                  <MessageSquare className={`w-5 h-5 ${showComments ? "text-[#0A0A0F]" : (darkMode ? "text-white group-hover:text-[#0A0A0F]" : "text-[#0A0A0F]")}`} />
                  {isDrawerOpen && (
                    <span className="text-sm font-semibold uppercase tracking-wide">Comments</span>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleDepartments}
                  className={`
                    w-full h-12 px-4 rounded-none
                    flex items-center gap-2
                    border-b-2 border-[#0A0A0F]
                    group
                    ${!isDrawerOpen ? "justify-center" : "justify-start"}
                    ${showDepartments ? "bg-[#FFD600] text-[#0A0A0F] font-bold" : (darkMode ? "bg-transparent text-white hover:bg-[#FFD600] hover:text-[#0A0A0F]" : "bg-white text-[#0A0A0F] hover:bg-[#FFD600]")}
                  `}
                >
                  <Filter className={`w-5 h-5 ${showDepartments ? "text-[#0A0A0F]" : (darkMode ? "text-white group-hover:text-[#0A0A0F]" : "text-[#0A0A0F]")}`} />
                  {isDrawerOpen && (
                    <span className="text-sm font-semibold uppercase tracking-wide">Filters</span>
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleGoogleSheets}
                  className={`
                    w-full h-12 px-4 rounded-none
                    flex items-center gap-2
                    border-b-2 border-[#0A0A0F]
                    group
                    ${!isDrawerOpen ? "justify-center" : "justify-start"}
                    ${showGoogleSheets ? "bg-[#FFD600] text-[#0A0A0F] font-bold" : (darkMode ? "bg-transparent text-white hover:bg-[#FFD600] hover:text-[#0A0A0F]" : "bg-white text-[#0A0A0F] hover:bg-[#FFD600]")}
                  `}
                >
                  <FileSpreadsheet className={`w-5 h-5 ${showGoogleSheets ? "text-[#0A0A0F]" : (darkMode ? "text-white group-hover:text-[#0A0A0F]" : "text-[#0A0A0F]")}`} />
                  {isDrawerOpen && (
                    <span className="text-sm font-semibold uppercase tracking-wide">Sheets</span>
                  )}
                </Button>


              </div>

              {isDrawerOpen && (
                <div 
                  className="flex-1 flex flex-col max-h-[calc(100vh-8.5rem)] overflow-hidden"
                  style={{ backgroundColor: darkMode ? '#1e1e32' : 'white' }}
                >
                  <div 
                    className={`flex-1 overflow-y-auto ${showContext ? "block" : "hidden"}`}
                    style={{ backgroundColor: darkMode ? '#1e1e32' : 'white' }}
                  >
                    <div className="p-4 space-y-4">
                      <div>
                        <label className={`text-xs font-bold uppercase tracking-wide mb-2 block ${darkMode ? "text-white" : "text-[#0A0A0F]"}`}>
                          Blueprint Details
                        </label>
                        <Textarea
                          placeholder="Add key details about this blueprint..."
                          value={blueprintDetails}
                          onChange={(e) => setBlueprintDetails(e.target.value)}
                          className={`min-h-[150px] resize-none border-2 rounded-none focus:ring-[#FFD600] ${darkMode ? "bg-[#1e1e32] text-white border-[#3a3a5c] focus:border-[#FFD600]" : "bg-white text-[#0A0A0F] border-[#0A0A0F] focus:border-[#0A0A0F]"}`}
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className={`text-xs font-bold uppercase tracking-wide block ${darkMode ? "text-white" : "text-[#0A0A0F]"}`}>
                            Segments
                          </label>
                          <Textarea
                            placeholder="Describe target segments for this blueprint..."
                            value={board.segments || ''}
                            onChange={(e) => {
                              updateBoard({ 
                                ...board, 
                                segments: e.target.value 
                              });
                            }}
                            className={`min-h-[80px] resize-none border-2 rounded-none focus:ring-[#FFD600] ${darkMode ? "bg-[#1e1e32] text-white border-[#3a3a5c] focus:border-[#FFD600]" : "bg-white text-[#0A0A0F] border-[#0A0A0F] focus:border-[#0A0A0F]"}`}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className={`text-xs font-bold uppercase tracking-wide block ${darkMode ? "text-white" : "text-[#0A0A0F]"}`}>
                            Emotional Journey Labels
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="Low Label (e.g. Low)"
                              value={board.emotionLowLabel || ''}
                              onChange={(e) => onBoardUpdate({ emotionLowLabel: e.target.value })}
                              className={`border-2 rounded-none focus:ring-[#FFD600] ${darkMode ? "bg-[#1e1e32] text-white border-[#3a3a5c] focus:border-[#FFD600]" : "bg-white text-[#0A0A0F] border-[#0A0A0F] focus:border-[#0A0A0F]"}`}
                            />
                            <Input
                              placeholder="High Label (e.g. High)"
                              value={board.emotionHighLabel || ''}
                              onChange={(e) => onBoardUpdate({ emotionHighLabel: e.target.value })}
                              className={`border-2 rounded-none focus:ring-[#FFD600] ${darkMode ? "bg-[#1e1e32] text-white border-[#3a3a5c] focus:border-[#FFD600]" : "bg-white text-[#0A0A0F] border-[#0A0A0F] focus:border-[#0A0A0F]"}`}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className={`text-xs font-bold uppercase tracking-wide block ${darkMode ? "text-white" : "text-[#0A0A0F]"}`}>
                            Other Blueprints
                          </label>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {projectBoards
                              ?.filter(b => b.id !== board.id)
                              .map(blueprint => (
                                <a
                                  key={blueprint.id}
                                  href={`/board/${blueprint.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`block p-2 text-sm border-2 rounded-none shadow-[2px_2px_0px_0px] transition-colors ${darkMode ? "bg-[#1e1e32] border-[#3a3a5c] text-white shadow-[#3a3a5c] hover:bg-[#FFD600] hover:text-[#0A0A0F] hover:shadow-none" : "bg-white border-[#0A0A0F] text-[#0A0A0F] shadow-[#0A0A0F] hover:bg-[#FFD600]"}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="truncate font-medium">{blueprint.name || 'Untitled Blueprint'}</span>
                                    <ExternalLink className={`w-3 h-3 flex-shrink-0 ml-1 ${darkMode ? "text-white" : "text-[#0A0A0F]"}`} />
                                  </div>
                                </a>
                              ))}
                            {(!projectBoards || projectBoards.filter(b => b.id !== board.id).length === 0) && (
                              <div className={`text-sm p-2 border-2 rounded-none ${darkMode ? "bg-[#1e1e32]/50 border-[#3a3a5c] text-gray-400" : "bg-gray-50 border-[#0A0A0F] text-gray-500"}`}>
                                No other blueprints in this project
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div 
                    className={`flex-1 overflow-y-auto ${showBlocks ? "block" : "hidden"}`}
                    style={{ backgroundColor: darkMode ? '#12121A' : 'white' }}
                  >
                    <Droppable droppableId="drawer" type="BLOCK">
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="p-4"
                        >
                          <BlockDrawer darkMode={darkMode} />
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>

                  <div
                    className={`flex-1 overflow-y-auto ${showComments ? "block" : "hidden"}`}
                    style={{ backgroundColor: darkMode ? '#12121A' : 'white' }}
                  >
                    <CommentsOverview
                      board={board}
                      onCommentClick={(block) => {
                        setSelectedBlock(block);
                        setCommentDialogOpen(true);
                        setHighlightedBlockId(block.id);
                        setTimeout(() => setHighlightedBlockId(null), 2000);
                      }}
                    />
                  </div>
                  <div
                    className={`flex-1 overflow-y-auto ${showDepartments ? "block" : "hidden"}`}
                    style={{ backgroundColor: darkMode ? '#1e1e32' : 'white' }}
                  >
                    <DepartmentFilter
                      blocks={board.blocks}
                      onFilterByDepartment={setDepartmentFilter}
                      onFilterByType={setTypeFilter}
                      departmentFilter={departmentFilter}
                      typeFilter={typeFilter}
                      darkMode={darkMode}
                    />
                  </div>
                  <div
                    className={`flex-1 overflow-y-auto ${showGoogleSheets ? "block" : "hidden"}`}
                    style={{ backgroundColor: darkMode ? '#12121A' : 'white' }}
                  >
                    <SheetDocumentsManager
                      boardId={Number(id)}
                      className="p-4"
                    />
                  </div>


                </div>
              )}
            </div>
          </div>

          <div className={`flex-1 overflow-x-auto overflow-y-auto fixed top-20 right-0 bottom-0 ${isDrawerOpen ? 'left-72' : 'left-16'} transition-all duration-300 ease-in-out`}>
            {showMinimap && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
                <div className="bg-white border border-gray-300 shadow-xl rounded-lg p-4 w-[80%] max-w-[1000px] max-h-[80vh]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-lg font-medium">Board Overview</div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowMinimap(false)}
                      className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                  <div 
                    ref={minimapRef} 
                    className="w-full overflow-auto bg-white rounded border border-gray-200"
                    style={{ 
                      height: 'calc(80vh - 80px)',
                      position: 'relative',
                      cursor: 'grab',
                    }}
                    onMouseDown={(e) => {
                      // Only handle primary mouse button (left click)
                      if (e.button !== 0) return;
                      
                      const container = minimapRef.current;
                      if (!container) return;
                      
                      // Mark as being dragged
                      container.style.cursor = 'grabbing';
                      
                      const startX = e.pageX;
                      const startY = e.pageY;
                      const scrollLeft = container.scrollLeft;
                      const scrollTop = container.scrollTop;
                      
                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        // Calculate distance moved
                        const dx = moveEvent.pageX - startX;
                        const dy = moveEvent.pageY - startY;
                        
                        // Move in opposite direction of drag (like map dragging)
                        container.scrollLeft = scrollLeft - dx;
                        container.scrollTop = scrollTop - dy;
                      };
                      
                      const handleMouseUp = () => {
                        // Reset cursor
                        container.style.cursor = 'grab';
                        
                        // Remove event listeners
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      // Register move and up events to document to catch events outside container
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  >
                    <div className="p-6" style={{ transform: 'scale(0.4)', transformOrigin: 'top left' }}>
                      <div className="flex items-start gap-8">
                        {board.phases.map((phase, phaseIndex) => (
                          <div key={`minimap-${phase.id}`} className="flex-shrink-0 relative mr-8">
                            <div className="px-4">
                              <div 
                                className="mb-4 border-[2px] border-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-100"
                                onClick={() => {
                                  // Find the corresponding phase in the main board and scroll to it
                                  const phaseElement = document.getElementById(`phase-${phase.id}`);
                                  if (phaseElement) {
                                    phaseElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    setShowMinimap(false);
                                  }
                                }}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="font-bold text-lg">{phase.name}</div>
                                </div>
                              </div>

                              <div className="flex gap-8">
                                {phase.columns.map((column, columnIndex) => (
                                  <div key={`minimap-${column.id}`} className={`flex-shrink-0 w-[270px] flex flex-col rounded-lg px-2 ${showAlternatingColumns && columnIndex % 2 === 0 ? 'blupi-column-halftone' : ''}`}>
                                    <div className="flex items-center gap-2 mb-2 mt-4">
                                      <div className="cursor-grab text-gray-600 p-1 -ml-1 rounded">
                                        <GripVertical className="w-4 h-4" />
                                      </div>
                                      <div 
                                        className="relative flex-1 cursor-pointer hover:bg-gray-100 rounded px-2"
                                        onClick={() => {
                                          // Try to find the corresponding column in the main board
                                          const columnElement = document.querySelector(`[data-column-id="${column.id}"]`);
                                          if (columnElement) {
                                            columnElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            setShowMinimap(false);
                                          }
                                        }}
                                      >
                                        <div className="text-base h-12 overflow-hidden text-ellipsis flex items-center">
                                          {column.name}
                                        </div>
                                      </div>
                                    </div>

                                    {column.image && (
                                      <div className="mb-4 relative rounded-lg border border-gray-300 bg-white aspect-video overflow-hidden">
                                        <img
                                          src={column.image}
                                          alt={column.name}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    )}

                                    <div className="space-y-4 min-h-[100px] p-4 rounded-lg border-1 border-gray-300 flex-1">
                                      {board.blocks
                                        .filter(b => b.phaseIndex === phaseIndex && b.columnIndex === columnIndex)
                                        .map((block, index) => {
                                          const blockType = LAYER_TYPES.find(l => l.type === block.type);
                                          const colorClass = blockType?.color || "bg-gray-100";
                                          
                                          return (
                                            <div 
                                              key={`minimap-${block.id}`}
                                              className={`
                                                ${colorClass}
                                                group relative rounded-lg border-3 border-gray-500 mb-2 p-2
                                                cursor-pointer hover:border-gray-900 hover:shadow-md
                                              `}
                                              onClick={() => {
                                                // Find the element in the main board and scroll to it
                                                const blockElement = document.getElementById(block.id);
                                                if (blockElement) {
                                                  blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                  setHighlightedBlockId(block.id);
                                                  setTimeout(() => setHighlightedBlockId(null), 2000);
                                                  setShowMinimap(false);
                                                }
                                              }}
                                            >
                                              {block.emoji && <div className="absolute top-1 right-1 text-xl">{block.emoji}</div>}
                                              <div className="text-sm mt-1 break-words font-normal">
                                                {block.content}
                                              </div>
                                              {(block.comments?.length > 0 || block.attachments?.length > 0) && (
                                                <div className="flex items-center gap-1 mt-2 text-gray-500">
                                                  {block.comments?.length > 0 && (
                                                    <div className="flex items-center gap-1">
                                                      <MessageSquare className="w-3 h-3" />
                                                      <span className="text-xs">{block.comments.length}</span>
                                                    </div>
                                                  )}
                                                  {block.attachments?.length > 0 && (
                                                    <div className="flex items-center gap-1 ml-2">
                                                      <Folder className="w-3 h-3" />
                                                      <span className="text-xs">{block.attachments.length}</span>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })
                                      }
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="flex-1 relative board-container">

              
              <div 
                ref={scrollContainerRef}
                className="overflow-x-auto"
                onMouseDown={(e) => {
                  if (spacePressed) {
                    e.preventDefault();
                    setIsDragging(true);
                    setDragStartX(e.clientX);
                    const container = e.currentTarget;
                    setScrollStartX(container.scrollLeft);
                    container.style.cursor = 'grabbing';
                  }
                }}
                onMouseMove={(e) => {
                  if (isDragging && spacePressed) {
                    e.preventDefault();
                    const container = e.currentTarget;
                    const deltaX = e.clientX - dragStartX;
                    const newScrollLeft = scrollStartX - deltaX;
                    
                    // Constrain scrolling within bounds
                    const maxScroll = container.scrollWidth - container.clientWidth;
                    container.scrollLeft = Math.max(0, Math.min(newScrollLeft, maxScroll));
                  }
                }}
                onMouseUp={() => {
                  if (isDragging) {
                    setIsDragging(false);
                    const container = document.getElementById('board-scroll-container');
                    if (container) {
                      container.style.cursor = spacePressed ? 'grab' : 'default';
                    }
                  }
                }}
                onMouseLeave={() => {
                  if (isDragging) {
                    setIsDragging(false);
                    const container = document.getElementById('board-scroll-container');
                    if (container) {
                      container.style.cursor = spacePressed ? 'grab' : 'default';
                    }
                  }
                }}
                style={{ 
                  cursor: spacePressed ? (isDragging ? 'grabbing' : 'grab') : 'default' 
                }}
              >
                <div ref={boardRef} className="p-4 sm:p-6 lg:p-8 pt-4 min-w-max" style={{ minWidth: '120vw' }}>
                  <div className="flex items-start gap-4 sm:gap-6 lg:gap-8">

                  {board.phases.map((phase, phaseIndex) => (
                    <div 
                      key={phase.id}
                      id={`phase-${phase.id}`} 
                      className="flex-shrink-0 relative mr-4 sm:mr-6 lg:mr-8">
                      <div className="px-4">
                        <div className={`mb-4 border-4 rounded-none p-3 group shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] ${darkMode ? 'border-[#3a3a5c] bg-[#2a2a4a]' : 'border-[#0A0A0F] bg-white shadow-[3px_3px_0px_0px_#0A0A0F]'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 flex-1">
                              <button
                                onClick={() => togglePhaseCollapse(phaseIndex)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
                                title={phase.collapsed ? "Expand phase" : "Collapse phase"}
                              >
                                {phase.collapsed ? (
                                  <Maximize2 className="w-4 h-4" />
                                ) : (
                                  <Minimize2 className="w-4 h-4" />
                                )}
                              </button>
                              <div className="flex items-center gap-2 flex-1">
                                <div
                                  contentEditable
                                  onBlur={(e) =>
                                    handlePhaseNameChange(
                                      phaseIndex,
                                      e.currentTarget.textContent || "",
                                    )
                                  }
                                  className="font-bold text-base focus:outline-none focus:border-b border-primary"
                                  suppressContentEditableWarning={true}
                                >
                                  {phase.name}
                                </div>
                                {phase.importedFromBoardId && (
                                  <Link 
                                    href={`/board/${phase.importedFromBoardId}`}
                                    className="opacity-60 hover:opacity-100 transition-opacity"
                                    title="View source blueprint"
                                  >
                                    <ExternalLink className="w-3 h-3 text-blue-600" />
                                  </Link>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {/* Phase movement arrows */}
                              <button
                                onClick={() => handleMovePhase(phaseIndex, 'left')}
                                disabled={phaseIndex === 0}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move phase left"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleMovePhase(phaseIndex, 'right')}
                                disabled={phaseIndex === board.phases.length - 1}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move phase right"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                              

                              
                              {/* Delete phase button */}
                              <button
                                onClick={() => handleDeletePhase(phaseIndex)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 hover:text-red-600 rounded"
                                title="Delete phase"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              
                              {/* Add column button - only show when phase is not collapsed */}
                              {!phase.collapsed && (
                                <Button
                                  size="sm"
                                  onClick={() => handleAddColumn(phaseIndex)}
                                  className={`h-8 px-4 border-2 rounded-none font-bold uppercase text-xs tracking-wide transition-all hide-in-pdf ${darkMode ? 'bg-[#2a2a4a] text-white border-[#3a3a5c] shadow-[4px_4px_0px_0px_#3a3a5c] hover:bg-[#FFD600] hover:text-[#0A0A0F] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]' : 'bg-white text-[#0A0A0F] border-[#0A0A0F] shadow-[4px_4px_0px_0px_#0A0A0F] hover:bg-[#FFD600] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]'}`}
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Step
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Per-phase Emotion Journey - always light mode */}
                        {showEmotionJourney && !phase.collapsed && phase.columns.length > 0 && (
                          <div className="mb-4 emotion-journey-light" style={{ colorScheme: 'light' }}>
                            <EmotionJourney 
                              phases={board.phases}
                              board={board}
                              onEmotionChange={handleEmotionChange}
                              singlePhaseIndex={phaseIndex}
                            />
                          </div>
                        )}

                        {!phase.collapsed && (
                          <Droppable
                            droppableId={`phase-${phaseIndex}`}
                            direction="horizontal"
                            type="COLUMN"
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="flex gap-4 md:gap-8"
                              >
                              {phase.columns.map((column, columnIndex) => (
                                <Draggable
                                  key={column.id}
                                  draggableId={`column-${phaseIndex}-${columnIndex}-${column.id}`}
                                  index={columnIndex}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      data-column-id={column.id}
                                      className={`flex-shrink-0 w-[220px] sm:w-[240px] md:w-[270px] flex flex-col rounded-lg px-2 ${showAlternatingColumns && columnIndex % 2 === 0 ? (darkMode ? 'bg-white/5' : 'blupi-column-halftone') : ''}`}
                                      style={{
                                        ...provided.draggableProps.style,
                                        zIndex: snapshot.isDragging ? 9999 : 'auto'
                                      }}
                                    >
                                      <div className="flex items-center gap-2 mb-2 mt-4 group">
                                        <div 
                                          {...provided.dragHandleProps}
                                          className="cursor-grab hover:text-gray-900 text-gray-600 p-1 -ml-1 rounded hover:bg-gray-100 active:cursor-grabbing"
                                          style={{
                                            cursor: snapshot.isDragging ? "grabbing" : "grab"
                                          }}
                                        >
                                          <GripVertical className="w-4 h-4" />
                                        </div>

                                        <div className="relative flex-1">
                                          <div
                                            contentEditable
                                            onBlur={(e) =>
                                              handleColumnNameChange(
                                                phaseIndex,
                                                columnIndex,
                                                e.currentTarget.textContent || "",
                                              )
                                            }
                                            className="text-xs font-bold focus:outline-none focus-visible:border-b focus-visible:border-primary h-16 py-2 overflow-y-auto whitespace-normal leading-tight"
                                            suppressContentEditableWarning={true}
                                            title={column.name}
                                          >
                                            {column.name}
                                          </div>
                                          {column.name && column.name.length > 75 && (
                                            <div className="absolute top-0 right-0 flex justify-end items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button 
                                                className="text-xs text-gray-500 bg-white p-1 rounded-md shadow"
                                                onClick={() => {
                                                  // Store the phase and column indices along with the text
                                                  // We'll parse these when saving
                                                  setExpandedStepText(`${phaseIndex}|${columnIndex}|${column.name}`);
                                                  setStepTextDialogOpen(true);
                                                }}
                                              >
                                                Expand
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleDeleteColumn(
                                              phaseIndex,
                                              columnIndex,
                                            )
                                          }
                                          className="h-6 w-6 p-0 hover:text-red-500 hide-in-pdf opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>

                                      {/* Image upload for column */}
                                      <div className="scale-90 origin-top -mb-4">
                                        <ImageUpload
                                          currentImage={column.image}
                                          onImageChange={(image) =>
                                            handleImageChange(
                                              phaseIndex,
                                              columnIndex,
                                              image,
                                            )
                                          }
                                          requireConfirmation={true}
                                          boardId={board.id}
                                          columnId={column.id}
                                          onStoryboardGenerated={(imageUrl, prompt) => {
                                            handleStoryboardGenerated(phaseIndex, columnIndex, imageUrl, prompt);
                                          }}
                                          storyboardPrompt={column.storyboardPrompt}
                                        />
                                      </div>



                                      <Droppable
                                        droppableId={`${phaseIndex}-${columnIndex}`}
                                        type="BLOCK"
                                      >
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={`
                                              space-y-4 min-h-[260px] p-2 rounded-lg border-1 border-gray-300 flex-1 relative
                                              ${
                                                snapshot.isDraggingOver
                                                  ? "border-primary/50 bg-primary/5"
                                                  : ""
                                              }
                                              transition-colors duration-200
                                            `}
                                            onMouseEnter={() => setHoveredColumn({phaseIndex, columnIndex})}
                                            onMouseLeave={() => setHoveredColumn(null)}
                                          >
                                            {(() => {
                                              const columnBlocks = board.blocks
                                                .filter(
                                                  (b) =>
                                                    (!departmentFilter ||
                                                     b.department === departmentFilter) &&
                                                    (!typeFilter ||
                                                     b.type === typeFilter)
                                                )
                                                .filter(
                                                  (b) =>
                                                    b.phaseIndex === phaseIndex &&
                                                    b.columnIndex === columnIndex,
                                                );

                                              if (groupBlocksByType && columnBlocks.length > 1) {
                                                const groupedByType = columnBlocks.reduce((acc, block) => {
                                                  const type = block.type || 'unknown';
                                                  if (!acc[type]) acc[type] = [];
                                                  acc[type].push(block);
                                                  return acc;
                                                }, {} as Record<string, BlockType[]>);

                                                const groupEntries = Object.entries(groupedByType);
                                                let blockIndex = 0;

                                                return (
                                                  <>
                                                    {groupEntries.map(([type, blocksOfType]) => {
                                                      const groupKey = `${phaseIndex}-${columnIndex}-${type}`;
                                                      const isGroupExpanded = expandedGroups.has(groupKey);
                                                      const layerType = LAYER_TYPES.find(l => l.type === type);

                                                      if (blocksOfType.length === 1 || isGroupExpanded) {
                                                        return (
                                                          <div key={groupKey}>
                                                            {isGroupExpanded && blocksOfType.length > 1 && (
                                                              <button
                                                                onClick={() => {
                                                                  const newExpanded = new Set(expandedGroups);
                                                                  newExpanded.delete(groupKey);
                                                                  setExpandedGroups(newExpanded);
                                                                }}
                                                                className={`w-full mb-2 p-2 text-xs font-medium rounded-lg border-2 border-dashed ${layerType?.color || 'border-gray-400'} bg-gray-50 hover:bg-gray-100 flex items-center justify-center gap-2 transition-colors`}
                                                              >
                                                                <ChevronUp className="w-3 h-3" />
                                                                Collapse {blocksOfType.length} {layerType?.label || type} blocks
                                                              </button>
                                                            )}
                                                            {blocksOfType.map((block) => {
                                                              const currentIndex = blockIndex++;
                                                              return (
                                                                <Draggable
                                                                  key={block.id}
                                                                  draggableId={block.id}
                                                                  index={currentIndex}
                                                                >
                                                                  {(provided, snapshot) => (
                                                                    <div
                                                                      id={block.id}
                                                                      ref={provided.innerRef}
                                                                      {...provided.draggableProps}
                                                                      className={`
                                                                        ${LAYER_TYPES.find((l) => l.type === block.type)?.color}
                                                                        group relative rounded-lg border-3 border-gray-500 mb-2 pl-6 pr-2 py-2
                                                                        transition-shadow duration-200
                                                                        ${snapshot.isDragging ? "shadow-xl z-50" : "hover:shadow-md hover:border-gray-900"}
                                                                        ${highlightedBlockId === block.id ? "ring-2 ring-primary ring-offset-2" : ""}
                                                                      `}
                                                                      style={{
                                                                        ...provided.draggableProps.style,
                                                                        zIndex: snapshot.isDragging ? 9999 : "auto"
                                                                      }}
                                                                    >
                                                                      <div 
                                                                        {...provided.dragHandleProps}
                                                                        className="absolute left-0 top-0 bottom-0 w-5 cursor-grab active:cursor-grabbing hover:bg-gray-900/10 transition-colors rounded-l-lg z-10 flex items-center justify-center"
                                                                        style={{ cursor: snapshot.isDragging ? "grabbing" : "grab" }}
                                                                        title="Drag to move block"
                                                                      >
                                                                        <div className="opacity-40 group-hover:opacity-100 transition-opacity">
                                                                          <GripVertical size={14} className={darkMode ? "text-white" : "text-gray-600"} />
                                                                        </div>
                                                                      </div>
                                                                      <Block
                                                                        block={block}
                                                                        boardId={Number(id)}
                                                                        onChange={(content, newType) => handleBlockChange(block.id, content, newType)}
                                                                        onAttachmentChange={handleAttachmentChange}
                                                                        onNotesChange={(notes) => handleNotesChange(block.id, notes)}
                                                                        onEmojiChange={(blockId, emoji) => handleEmojiChange(blockId, emoji)}
                                                                        onDepartmentChange={handleDepartmentChange}
                                                                        onSheetsConnectionChange={handleSheetsConnectionChange}
                                                                        bulkEditMode={bulkEditMode}
                                                                        isSelected={selectedBlocks.has(block.id)}
                                                                        onSelectionToggle={() => toggleBlockSelection(block.id)}
                                                                        onDelete={handleDeleteBlock}
                                                                        onCommentClick={() => handleCommentClick(block)}
                                                                        projectId={board.projectId || undefined}
                                                                        isCondensed={boardViewMode === 'condensed'}
                                                                        isExpanded={expandedBlockId === block.id}
                                                                        onToggleExpand={() => {
                                                                          if (boardViewMode === 'condensed') {
                                                                            setExpandedBlockId(expandedBlockId === block.id ? null : block.id);
                                                                          }
                                                                        }}
                                                                        onFlag={handleFlagBlock}
                                                                        onUnflag={handleUnflagBlock}
                                                                        isFlagged={flaggedBlocks.has(block.id)}
                                                                        isDragging={snapshot.isDragging}
                                                                      />
                                                                    </div>
                                                                  )}
                                                                </Draggable>
                                                              );
                                                            })}
                                                          </div>
                                                        );
                                                      }

                                                      // Collapsed stack view for multiple blocks of same type (not draggable)
                                                      const firstBlock = blocksOfType[0];
                                                      return (
                                                        <div
                                                          key={groupKey}
                                                          onClick={() => {
                                                            const newExpanded = new Set(expandedGroups);
                                                            newExpanded.add(groupKey);
                                                            setExpandedGroups(newExpanded);
                                                          }}
                                                          className={`
                                                            relative cursor-pointer rounded-lg border-3 mb-2 p-2 w-full aspect-square
                                                            ${layerType?.color || 'border-gray-400'}
                                                            hover:shadow-md transition-all bg-white flex flex-col
                                                            shadow-[0_0_0_1px_rgba(0,0,0,0.1)]
                                                          `}
                                                        >
                                                          {/* Stacked card effect - visible left/top borders */}
                                                          <div 
                                                            className={`absolute -bottom-1 -right-1 left-1 top-1 rounded-lg border-2 ${layerType?.color || 'border-gray-300'} bg-white -z-10 shadow-[0_0_0_1px_rgba(0,0,0,0.05)]`}
                                                          />
                                                          {blocksOfType.length > 2 && (
                                                            <div 
                                                              className={`absolute -bottom-2 -right-2 left-2 top-2 rounded-lg border-2 ${layerType?.color || 'border-gray-300'} bg-gray-50 -z-20 shadow-[0_0_0_1px_rgba(0,0,0,0.05)]`}
                                                            />
                                                          )}
                                                          
                                                          <div className="flex items-center justify-between mb-1">
                                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${layerType?.color?.replace('border-', 'bg-') || 'bg-gray-400'}`} />
                                                              <span className="text-xs font-bold text-gray-900 truncate">
                                                                {layerType?.label || type}
                                                              </span>
                                                            </div>
                                                            <div className={`
                                                              flex items-center justify-center shrink-0
                                                              w-6 h-6 rounded-md border-2 
                                                              ${layerType?.color || 'border-gray-400'}
                                                              bg-gray-50 text-[10px] font-black text-gray-900
                                                            `}>
                                                              {blocksOfType.length}
                                                            </div>
                                                          </div>
                                                          
                                                          <p className="text-[10px] text-gray-600 line-clamp-3 leading-tight overflow-hidden">
                                                            {firstBlock.content || 'Click to expand'}
                                                          </p>
                                                          
                                                          <div className="mt-auto flex justify-end">
                                                            <ChevronDown className="w-3 h-3 text-gray-400" />
                                                          </div>
                                                        </div>
                                                      );
                                                    })}
                                                  </>
                                                );
                                              }

                                              // Normal rendering (no grouping)
                                              return columnBlocks.map((block, index) => (
                                                <Draggable
                                                  key={block.id}
                                                  draggableId={block.id}
                                                  index={index}
                                                >
                                                  {(provided, snapshot) => (
                                                    <div
                                                      id={block.id}
                                                      ref={provided.innerRef}
                                                      {...provided.draggableProps}
                                                      className={`
                                                        ${LAYER_TYPES.find((l) => l.type === block.type)?.color}
                                                        group relative rounded-lg border-3 border-gray-500 mb-2 pl-6 pr-2 py-2
                                                        transition-shadow duration-200
                                                        ${snapshot.isDragging ? "shadow-xl z-50" : "hover:shadow-md hover:border-gray-900"}
                                                        ${highlightedBlockId === block.id ? "ring-2 ring-primary ring-offset-2" : ""}
                                                      `}
                                                      style={{
                                                        ...provided.draggableProps.style,
                                                        zIndex: snapshot.isDragging ? 9999 : "auto"
                                                      }}
                                                    >
                                                      <div 
                                                        {...provided.dragHandleProps}
                                                        className="absolute left-0 top-0 bottom-0 w-5 cursor-grab active:cursor-grabbing hover:bg-gray-900/10 transition-colors rounded-l-lg z-10 flex items-center justify-center"
                                                        style={{ cursor: snapshot.isDragging ? "grabbing" : "grab" }}
                                                        title="Drag to move block"
                                                      >
                                                        <div className="opacity-40 group-hover:opacity-100 transition-opacity">
                                                          <GripVertical size={14} className={darkMode ? "text-white" : "text-gray-600"} />
                                                        </div>
                                                      </div>
                                                      <Block
                                                        block={block}
                                                        boardId={Number(id)}
                                                        onChange={(content, newType) => handleBlockChange(block.id, content, newType)}
                                                        onAttachmentChange={handleAttachmentChange}
                                                        onNotesChange={(notes) => handleNotesChange(block.id, notes)}
                                                        onEmojiChange={(blockId, emoji) => handleEmojiChange(blockId, emoji)}
                                                        onDepartmentChange={handleDepartmentChange}
                                                        onSheetsConnectionChange={handleSheetsConnectionChange}
                                                        bulkEditMode={bulkEditMode}
                                                        isSelected={selectedBlocks.has(block.id)}
                                                        onSelectionToggle={() => toggleBlockSelection(block.id)}
                                                        onDelete={handleDeleteBlock}
                                                        onCommentClick={() => handleCommentClick(block)}
                                                        projectId={board.projectId || undefined}
                                                        isCondensed={boardViewMode === 'condensed'}
                                                        isExpanded={expandedBlockId === block.id}
                                                        onToggleExpand={() => {
                                                          if (boardViewMode === 'condensed') {
                                                            setExpandedBlockId(expandedBlockId === block.id ? null : block.id);
                                                          }
                                                        }}
                                                        onFlag={handleFlagBlock}
                                                        onUnflag={handleUnflagBlock}
                                                        isFlagged={flaggedBlocks.has(block.id)}
                                                        isDragging={snapshot.isDragging}
                                                      />
                                                    </div>
                                                  )}
                                                </Draggable>
                                              ));
                                            })()}
                                          {provided.placeholder}
                                          
                                          {/* Quick block creation button */}
                                          {hoveredColumn?.phaseIndex === phaseIndex && 
                                           hoveredColumn?.columnIndex === columnIndex && 
                                           !isPublicView && (
                                            <div className="flex justify-center mt-2">
                                              <Popover 
                                                open={showBlockTypeMenu?.phaseIndex === phaseIndex && showBlockTypeMenu?.columnIndex === columnIndex}
                                                onOpenChange={(open) => {
                                                  if (!open) setShowBlockTypeMenu(null);
                                                }}
                                              >
                                                <PopoverTrigger asChild>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 opacity-70 hover:opacity-100 transition-opacity"
                                                    onClick={() => setShowBlockTypeMenu({phaseIndex, columnIndex})}
                                                  >
                                                    <Plus className="w-4 h-4" />
                                                  </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-80 p-0" align="center" side="bottom">
                                                  <div className="p-4 pb-2">
                                                    <h4 className="text-sm font-medium text-gray-900 mb-1">Add Block to Current Step</h4>
                                                    <p className="text-xs text-gray-500 mb-3">Block Type</p>
                                                  </div>
                                                  <Command 
                                                    className="border-none"
                                                    shouldFilter={true}
                                                  >
                                                    <div className="px-4 pb-2">
                                                      <CommandInput 
                                                        placeholder="Select block type..." 
                                                        className="h-9"
                                                        autoFocus
                                                      />
                                                    </div>
                                                    <CommandEmpty className="py-6 text-center text-sm text-gray-500">
                                                      No block type found.
                                                    </CommandEmpty>
                                                    <CommandList className="max-h-[300px] overflow-auto">
                                                      <CommandGroup className="px-2 pb-2">
                                                        {LAYER_TYPES.map((layerType) => (
                                                          <CommandItem
                                                            key={layerType.type}
                                                            value={layerType.label}
                                                            onSelect={() => handleQuickBlockCreation(
                                                              phaseIndex,
                                                              columnIndex,
                                                              layerType.type
                                                            )}
                                                            className="flex items-center gap-3 cursor-pointer px-3 py-2 rounded-md data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                                                          >
                                                            <div className={`w-4 h-4 rounded-sm ${layerType.color}`}></div>
                                                            <span className="font-medium">{layerType.label}</span>
                                                          </CommandItem>
                                                        ))}
                                                      </CommandGroup>
                                                    </CommandList>
                                                  </Command>
                                                </PopoverContent>
                                              </Popover>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </Droppable>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                      )}
                      </div>
                    </div>
                  ))}
                  <div className="flex-shrink-0 pt-3">
                    <Button
                      size="sm"
                      onClick={handleAddPhase}
                      className={`h-8 px-4 border-2 rounded-none font-bold uppercase text-xs tracking-wide transition-all hide-in-pdf ${darkMode ? 'bg-[#2a2a4a] text-white border-[#3a3a5c] shadow-[4px_4px_0px_0px_#3a3a5c] hover:bg-[#FFD600] hover:text-[#0A0A0F] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]' : 'bg-white text-[#0A0A0F] border-[#0A0A0F] shadow-[4px_4px_0px_0px_#0A0A0F] hover:bg-[#FFD600] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]'}`}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Phase
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>



            {selectedBlock && (
              <CommentDialog
                open={commentDialogOpen}
                onOpenChange={setCommentDialogOpen}
                block={selectedBlock}
                boardId={id}
                onCommentAdd={(comment) => {
                  if (!onBlocksChange) return;
                  const blocks = board.blocks.map((b) =>
                    b.id === selectedBlock.id
                      ? { ...b, comments: [...(b.comments || []), comment] }
                      : b,
                  );
                  onBlocksChange(blocks);
                }}
              />
            )}

            <AddToProjectDialog
              open={addToProjectOpen}
              onOpenChange={setAddToProjectOpen}
              boardId={id}
            />

            {inviteOpen && (
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Team Members</DialogTitle>
                    <DialogDescription>
                      Enter email addresses to invite team members{" "}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Input
                      placeholder="Enter email addresses (comma separated)"
                      className="w-full"
                    />
                    <Button
                      className="w-full"
                      onClick={() => setInviteOpen(false)}
                    >
                      Send Invites
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {shareLinkOpen && (
              <Dialog open={shareLinkOpen} onOpenChange={setShareLinkOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Share Blueprint</DialogTitle>
                    <DialogDescription>
                      Choose how you want to share this blueprint
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">
                        Team Access (Requires Login)
                      </h3>
                      <div className="flex gap-2">
                        <Input
                          value={window.location.href}
                          readOnly
                          className="w-full"
                        />
                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            useToast({
                              title: "Link copied",
                              description:
                                "Team access link has been copied to clipboard",
                            });
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">
                        Public Access (Read-only, No Login Required)
                      </h3>
                      <div className="flex gap-2">
                        <Input
                          value={`${window.location.origin}/public/board/${id}`}
                          readOnly
                          className="w-full"
                        />
                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${window.location.origin}/public/board/${id}`,
                            );
                            useToast({
                              title: "Link copied",
                              description:
                                "Public access link has been copied to clipboard",
                            });
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Anyone with this link can view the blueprint in
                        read-only mode
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </DragDropContext>
      </div>
      
      {/* Step Text Expanded Dialog */}
      <Dialog open={stepTextDialogOpen} onOpenChange={setStepTextDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Step Text</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <textarea
              className="w-full p-4 bg-gray-50 rounded-md border text-base min-h-[100px]"
              value={expandedStepText.split('|').slice(2).join('|')}
              onChange={(e) => {
                // Keep the indices when updating text
                const parts = expandedStepText.split('|');
                const indices = parts.slice(0, 2);
                setExpandedStepText([...indices, e.target.value].join('|'));
              }}
            />
            <div className="flex justify-end">
              <Button 
                onClick={() => {
                  // We need to store phaseIndex and columnIndex when opening the dialog
                  // This way we know exactly which column to update
                  const [currentPhaseIndex, currentColumnIndex] = expandedStepText.split('|');
                  const phaseIndex = parseInt(currentPhaseIndex);
                  const columnIndex = parseInt(currentColumnIndex);
                  
                  // Get the actual text content without the index information
                  const actualText = expandedStepText.split('|').slice(2).join('|');
                  
                  // Update the column name
                  handleColumnNameChange(phaseIndex, columnIndex, actualText);
                  
                  setStepTextDialogOpen(false);
                }}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <ProfileModal 
        open={profileModalOpen} 
        onOpenChange={setProfileModalOpen} 
      />
      
      {/* Presentation Mode */}
      {presentationMode && (
        <div className={`fixed inset-0 z-50 flex animate-in slide-in-from-top-full duration-500 ease-out presentation-mode ${
          presentationDarkMode ? 'bg-[#0A0A0F]' : 'bg-white'
        }`}>
          {/* Main Presentation Area */}
          <div className="flex-1 flex flex-col">
            {/* Presentation Header */}
            <div className={`flex items-center justify-between p-4 border-b-2 ${
              presentationDarkMode ? 'bg-[#12121A] border-[#333333]' : 'bg-gray-50 border-[#0A0A0F]'
            }`}>
              {/* Left side - Board name and path */}
              <div className="flex items-center gap-4 max-w-md">
                <h1 className={`text-xl font-black uppercase tracking-wider truncate ${
                  presentationDarkMode ? 'text-white' : 'text-[#0A0A0F]'
                }`} title={board.name}>{board.name}</h1>
                {currentStep && (
                  <div className={`text-xs font-bold uppercase tracking-widest truncate ${
                    presentationDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`} title={`${currentStep.phaseName} → ${currentStep.columnName}`}>
                    {currentStep.phaseName} &gt; {currentStep.columnName}
                  </div>
                )}
              </div>
              
              {/* Right side - Step selector and navigation controls */}
              <div className="flex items-center gap-3">
                {/* Step Counter with Border - Smaller size */}
                <div className={`border-2 rounded-none px-2 py-1 shadow-[2px_2px_0px_0px] transition-all ${
                  presentationDarkMode ? 'border-[#333333] bg-[#12121A] shadow-[#333333]' : 'border-[#0A0A0F] bg-white shadow-[#0A0A0F]'
                }`}>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className={`text-xs font-black uppercase tracking-widest px-2 py-1 h-auto w-full justify-between rounded-none ${
                        presentationDarkMode ? 'text-white hover:text-[#0A0A0F] hover:bg-[#FFD600]' : 'text-[#0A0A0F] hover:bg-[#FFD600]'
                      }`}
                    >
                      Step {currentStepIndex + 1} of {allSteps.length}
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className={`w-80 p-0 rounded-none border-2 shadow-[4px_4px_0px_0px] ${
                    presentationDarkMode ? 'bg-[#12121A] border-[#333333] shadow-[#333333]' : 'bg-white border-[#0A0A0F] shadow-[#0A0A0F]'
                  }`} align="start">
                    <div className={`p-3 border-b-2 ${
                      presentationDarkMode ? 'border-[#333333]' : 'border-[#0A0A0F]'
                    }`}>
                      <h4 className={`font-black uppercase tracking-widest text-xs ${
                        presentationDarkMode ? 'text-white' : 'text-[#0A0A0F]'
                      }`}>Select Step</h4>
                    </div>
                    <ScrollArea className="h-80">
                      <div className="p-2">
                        {allSteps.map((step, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentStepIndex(index)}
                            className={`w-full text-left p-3 rounded-none border-2 border-transparent hover:border-[#FFD600] transition-all ${
                              presentationDarkMode ? 'text-gray-300 hover:bg-[#1e1e32]' : 'text-[#0A0A0F] hover:bg-gray-50'
                            } ${
                              index === currentStepIndex ? 
                                (presentationDarkMode ? 'bg-[#1e1e32] border-[#FFD600]' : 'bg-gray-100 border-[#0A0A0F]') : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-bold truncate ${
                                  presentationDarkMode ? 'text-white' : 'text-[#0A0A0F]'
                                }`}>
                                  {step.columnName}
                                </div>
                                <div className={`text-[10px] font-bold uppercase tracking-tighter ${
                                  presentationDarkMode ? 'text-gray-500' : 'text-gray-500'
                                }`}>
                                  {step.blocks.length} block{step.blocks.length !== 1 ? 's' : ''}
                                </div>
                              </div>
                              <div className={`text-xs font-black ml-2 ${
                                presentationDarkMode ? 'text-[#FFD600]' : 'text-[#0A0A0F]'
                              }`}>
                                {index + 1}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
                </div>
                
                {/* Navigation controls */}
                <Button
                  onClick={() => setPresentationViewMode(presentationViewMode === 'compact' ? 'large' : 'compact')}
                  variant="ghost"
                  size="sm"
                  className={`h-9 w-9 p-0 rounded-none border-2 shadow-[2px_2px_0px_0px] transition-all ${
                    presentationDarkMode 
                      ? 'border-[#333333] text-white hover:bg-[#FFD600] hover:text-[#0A0A0F] hover:border-[#0A0A0F] shadow-[#333333] hover:shadow-none' 
                      : 'border-[#0A0A0F] text-[#0A0A0F] hover:bg-[#FFD600] shadow-[#0A0A0F] hover:shadow-none'
                  }`}
                  title={presentationViewMode === 'compact' ? "Switch to Large View" : "Switch to Compact View"}
                >
                  {presentationViewMode === 'compact' ? (
                    <Maximize2 className="w-4 h-4" />
                  ) : (
                    <Minimize2 className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  onClick={() => setPresentationDarkMode(!presentationDarkMode)}
                  variant="ghost"
                  size="sm"
                  className={`h-9 w-9 p-0 rounded-none border-2 shadow-[2px_2px_0px_0px] transition-all ${
                    presentationDarkMode 
                      ? 'border-[#333333] text-white hover:bg-[#FFD600] hover:text-[#0A0A0F] hover:border-[#0A0A0F] shadow-[#333333] hover:shadow-none' 
                      : 'border-[#0A0A0F] text-[#0A0A0F] hover:bg-[#FFD600] shadow-[#0A0A0F] hover:shadow-none'
                  }`}
                  title={presentationDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  {presentationDarkMode ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prevStep}
                  disabled={currentStepIndex === 0}
                  className={`h-9 w-9 p-0 rounded-none border-2 shadow-[2px_2px_0px_0px] transition-all ${
                    presentationDarkMode 
                      ? 'border-[#333333] text-white hover:bg-[#FFD600] hover:text-[#0A0A0F] hover:border-[#0A0A0F] shadow-[#333333] hover:shadow-none disabled:opacity-30 disabled:shadow-none' 
                      : 'border-[#0A0A0F] text-[#0A0A0F] hover:bg-[#FFD600] shadow-[#0A0A0F] hover:shadow-none disabled:opacity-30 disabled:shadow-none'
                  }`}
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={nextStep}
                  disabled={currentStepIndex === allSteps.length - 1}
                  className={`h-9 w-9 p-0 rounded-none border-2 shadow-[2px_2px_0px_0px] transition-all ${
                    presentationDarkMode 
                      ? 'border-[#333333] text-white hover:bg-[#FFD600] hover:text-[#0A0A0F] hover:border-[#0A0A0F] shadow-[#333333] hover:shadow-none disabled:opacity-30 disabled:shadow-none' 
                      : 'border-[#0A0A0F] text-[#0A0A0F] hover:bg-[#FFD600] shadow-[#0A0A0F] hover:shadow-none disabled:opacity-30 disabled:shadow-none'
                  }`}
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
                <div className={`w-px h-6 mx-2 ${
                  presentationDarkMode ? 'bg-[#333333]' : 'bg-[#0A0A0F]'
                }`} />
                {/* Export Controls */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-9 w-9 p-0 rounded-none border-2 shadow-[2px_2px_0px_0px] transition-all ${
                        presentationDarkMode 
                          ? 'border-[#333333] text-white hover:bg-[#FFD600] hover:text-[#0A0A0F] hover:border-[#0A0A0F] shadow-[#333333] hover:shadow-none' 
                          : 'border-[#0A0A0F] text-[#0A0A0F] hover:bg-[#FFD600] shadow-[#0A0A0F] hover:shadow-none'
                      }`}
                      title="Export Presentation"
                    >
                      <FileDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <PopoverContent className={`w-80 p-0 rounded-none border-2 shadow-[4px_4px_0px_0px] ${
                    presentationDarkMode ? 'bg-[#12121A] border-[#333333] shadow-[#333333]' : 'bg-white border-[#0A0A0F] shadow-[#0A0A0F]'
                  }`} align="end">
                    <div className="flex flex-col p-1">
                      <button onClick={exportPresentationToPDF} className={`flex items-center gap-2 p-2 text-xs font-bold uppercase tracking-widest hover:bg-[#FFD600] hover:text-[#0A0A0F] transition-colors text-left ${presentationDarkMode ? 'text-white' : 'text-[#0A0A0F]'}`}>
                        <FileType className="h-4 w-4" />
                        Export to PDF
                      </button>
                      <button onClick={exportPresentationToSlides} className={`flex items-center gap-2 p-2 text-xs font-bold uppercase tracking-widest hover:bg-[#FFD600] hover:text-[#0A0A0F] transition-colors text-left ${presentationDarkMode ? 'text-white' : 'text-[#0A0A0F]'}`}>
                        <Presentation className="h-4 w-4" />
                        Export to Slides
                      </button>
                    </div>
                  </PopoverContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exportNotesToText}
                  className={`h-9 w-9 p-0 rounded-none border-2 shadow-[2px_2px_0px_0px] transition-all ${
                    presentationDarkMode 
                      ? 'border-[#333333] text-white hover:bg-[#FFD600] hover:text-[#0A0A0F] hover:border-[#0A0A0F] shadow-[#333333] hover:shadow-none' 
                      : 'border-[#0A0A0F] text-[#0A0A0F] hover:bg-[#FFD600] shadow-[#0A0A0F] hover:shadow-none'
                  }`}
                  title="Export Notes as Text"
                >
                  <FileType className="w-4 h-4" />
                </Button>

                <div className={`w-px h-6 mx-2 ${
                  presentationDarkMode ? 'bg-[#333333]' : 'bg-[#0A0A0F]'
                }`} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exitPresentationMode}
                  className={`h-9 w-9 p-0 rounded-none border-2 shadow-[2px_2px_0px_0px] transition-all ${
                    presentationDarkMode 
                      ? 'border-[#333333] text-white hover:bg-red-500 hover:text-white hover:border-red-500 shadow-[#333333] hover:shadow-none' 
                      : 'border-[#0A0A0F] text-[#0A0A0F] hover:bg-red-500 hover:text-white hover:border-red-500 shadow-[#0A0A0F] hover:shadow-none'
                  }`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Step Content */}
            <div className="flex-1 flex overflow-hidden bauhaus-halftone-bg">
              {/* No steps fallback */}
              {!currentStep && (
                <div className="flex-1 flex items-center justify-center">
                  <div className={`text-center p-12 border-4 border-dashed rounded-none ${
                    presentationDarkMode ? 'border-[#333333] text-gray-400' : 'border-gray-300 text-gray-500'
                  }`}>
                    <Fullscreen className={`w-20 h-20 mx-auto mb-6 ${
                      presentationDarkMode ? 'text-[#333333]' : 'text-gray-300'
                    }`} />
                    <h2 className="font-black uppercase tracking-widest text-xl mb-2">No Steps Available</h2>
                    <p className="font-bold uppercase tracking-widest text-xs">Add phases and columns to your board to start presenting</p>
                  </div>
                </div>
              )}
              
              {/* Left Side - Step Image/Visual */}
              {currentStep && (
              <div className={`${presentationViewMode === 'large' ? 'flex-1' : 'flex-1'} overflow-y-auto overflow-x-hidden ${presentationViewMode === 'large' ? 'pr-6' : 'pr-8'} p-8 presentation-scrollbar ${
                presentationDarkMode ? 'dark' : ''
              }`}>
                {/* Step Image - Primary image from column, fallback to first block image */}
                <div className={`rounded-none border-4 shadow-[8px_8px_0px_0px] transition-all ${presentationViewMode === 'large' ? 'h-[75vh] w-full max-w-5xl mx-auto' : 'h-96'} flex items-center justify-center mb-10 ${
                  presentationDarkMode ? 'bg-[#12121A] border-[#333333] shadow-[#333333]' : 'bg-white border-[#0A0A0F] shadow-[#0A0A0F]'
                }`}>
                  {currentStep.columnImage ? (
                    <img 
                      src={currentStep.columnImage}
                      alt="Step visual"
                      className={`${presentationViewMode === 'large' ? 'max-w-full max-h-full object-contain' : 'max-w-full max-h-full object-contain'} rounded-none`}
                    />
                  ) : (() => {
                    const imageBlock = currentStep.blocks.find(block => 
                      Array.isArray(block.attachments) && block.attachments.some(att => att.type === 'image')
                    );
                    const imageAttachment = imageBlock?.attachments?.find(att => att.type === 'image');
                    
                    return imageAttachment ? (
                      <img 
                        src={imageAttachment.url}
                        alt="Step visual"
                        className="max-w-full max-h-full object-contain rounded-none"
                      />
                    ) : (
                      <div className={`text-center ${
                        presentationDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        <Fullscreen className={`w-16 h-16 mx-auto mb-4 ${
                          presentationDarkMode ? 'text-[#333333]' : 'text-gray-300'
                        }`} />
                        <p className="font-black uppercase tracking-widest text-xs">No visual content</p>
                      </div>
                    );
                  })()}
                </div>
                
                {/* Step Details */}
                <div className="space-y-6 max-w-5xl mx-auto">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-3 bg-[#FFD600]" />
                    <h2 className={`text-4xl font-black uppercase tracking-tighter ${
                      presentationDarkMode ? 'text-white' : 'text-[#0A0A0F]'
                    } truncate`} title={currentStep.columnName}>
                      {currentStep.columnName}
                    </h2>
                  </div>
                  
                  {/* Blocks Content */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                    {currentStep.blocks.map((block, index) => {
                      const IconComponent = (Icons as any)[getIconForBlockType(block.type)] || Icons.Square;
                      const layerType = LAYER_TYPES.find(l => l.type === block.type);
                      
                      return (
                        <div 
                          key={block.id} 
                          className={`border-4 rounded-none p-6 shadow-[4px_4px_0px_0px] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px] ${
                            presentationDarkMode ? 'bg-[#12121A] border-[#333333] shadow-[#333333]' : 'bg-white border-[#0A0A0F] shadow-[#0A0A0F]'
                          }`}
                          style={{ 
                            borderLeftWidth: '12px',
                            borderLeftColor: (layerType?.color && !layerType.isDivider) ? 
                              (layerType.color.includes('blue-600') ? '#2563eb' : 
                               layerType.color.includes('indigo-500') ? '#6366f1' :
                               layerType.color.includes('cyan-500') ? '#06b6d4' :
                               layerType.color.includes('green-500') ? '#22c55e' :
                               layerType.color.includes('pink-500') ? '#ec4899' :
                               layerType.color.includes('red-500') ? '#ef4444' :
                               layerType.color.includes('orange-500') ? '#f97316' :
                               layerType.color.includes('purple-500') ? '#a855f7' :
                               layerType.color.includes('violet-500') ? '#8b5cf6' :
                               layerType.color.includes('yellow-500') ? '#eab308' :
                               layerType.color.includes('emerald-500') ? '#10b981' :
                               layerType.color.includes('fuchsia-500') ? '#d946ef' :
                               layerType.color.includes('teal-500') ? '#14b8a6' :
                               layerType.color.includes('amber-500') ? '#f59e0b' :
                               layerType.color.includes('rose-500') ? '#f43f5e' : '#6B7280') : '#6B7280'
                          }}
                        >
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                              <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 ${
                                presentationDarkMode ? 'bg-[#333333] text-white' : 'bg-[#0A0A0F] text-white'
                              }`}>
                                {layerType?.label || block.type}
                              </div>
                              <div className={presentationDarkMode ? "text-white" : "text-[#0A0A0F]"}>
                                {block.emoji ? (
                                  <span className="text-2xl">{block.emoji}</span>
                                ) : (
                                  <IconComponent className="w-6 h-6 stroke-[2.5]" />
                                )}
                              </div>
                            </div>
                            
                              <div className="flex-1">
                                {block.content && (
                                  <div className={`text-lg font-bold leading-tight whitespace-pre-wrap ${
                                    presentationDarkMode ? 'text-gray-200' : 'text-[#0A0A0F]'
                                  }`}>
                                    {block.content}
                                  </div>
                                ) || <div className="text-sm italic opacity-50">Empty block</div>}
                                
                                {/* Non-image attachments */}
                                {Array.isArray(block.attachments) && block.attachments.filter(att => att.type !== 'image').length > 0 && (
                                  <div className="mt-4 space-y-2">
                                    {block.attachments.filter(att => att.type !== 'image').map((attachment, attIndex) => (
                                      <div key={attIndex} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#FFD600]">
                                        {attachment.type === 'video' && <Play className="w-4 h-4 fill-current" />}
                                        {attachment.type === 'link' && <ExternalLink className="w-4 h-4" />}
                                        <span>{attachment.type} attachment</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                            {/* Image attachments as grid */}
                            {Array.isArray(block.attachments) && block.attachments.filter(att => att.type === 'image').length > 0 && (
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {block.attachments
                                  .filter(att => att.type === 'image')
                                  .map((attachment, attIndex) => (
                                    <div key={attIndex} className={`aspect-square rounded-none border-2 overflow-hidden ${
                                      presentationDarkMode ? 'border-[#333333]' : 'border-[#0A0A0F]'
                                    }`}>
                                      <img 
                                        src={attachment.url}
                                        alt={attachment.title || "Block attachment"}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {currentStep.blocks.length === 0 && (
                      <div className="col-span-full text-center py-12 border-4 border-dashed rounded-none border-gray-300">
                        <p className="font-black uppercase tracking-widest text-gray-400">No content in this step</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )}
            </div>
          </div>
          
          {/* Right Sidebar - Notes and Add Block */}
          <div className={`${presentationViewMode === 'large' ? 'w-80' : 'w-80'} border-l-2 flex flex-col ${
            presentationDarkMode ? 'bg-[#12121A] border-[#333333]' : 'bg-gray-50 border-[#0A0A0F]'
          }`}>
            <div className={`p-4 border-b-2 ${
              presentationDarkMode ? 'bg-[#12121A] border-[#333333]' : 'bg-white border-[#0A0A0F]'
            }`}>
              <h3 className={`font-black uppercase tracking-widest text-xs ${
                presentationDarkMode ? 'text-white' : 'text-[#0A0A0F]'
              }`}>Presentation Notes</h3>
            </div>
            <div className={`flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 presentation-scrollbar ${
              presentationDarkMode ? 'dark' : ''
            }`}>
              <Textarea
                value={presentationNotes}
                onChange={(e) => setPresentationNotes(e.target.value)}
                placeholder="Add your notes for this presentation..."
                className={`w-full h-48 resize-none border-2 rounded-none p-3 font-bold ${
                  presentationDarkMode ? 'bg-[#0A0A0F] border-[#333333] text-white placeholder-gray-600 focus:border-[#FFD600]' : 'bg-white border-[#0A0A0F] text-[#0A0A0F] placeholder-gray-400 focus:border-[#FFD600]'
                }`}
              />
              
              {/* Add New Block Section */}
              <div className={`border-t-2 pt-6 mt-4 ${
                presentationDarkMode ? 'border-[#333333]' : 'border-[#0A0A0F]'
              }`}>
                <h4 className={`font-black uppercase tracking-widest text-[10px] mb-4 ${
                  presentationDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Add Block to Step</h4>
                
                {!addBlockPopoverOpen ? (
                  <Button
                    onClick={() => setAddBlockPopoverOpen(true)}
                    className={`w-full font-black uppercase tracking-widest text-xs rounded-none border-4 shadow-[4px_4px_0px_0px] transition-all hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] ${
                      presentationDarkMode 
                        ? 'bg-white text-[#0A0A0F] border-[#333333] shadow-[#333333] hover:bg-[#FFD600]' 
                        : 'bg-white text-[#0A0A0F] border-[#0A0A0F] shadow-[#0A0A0F] hover:bg-[#FFD600]'
                    }`}
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2 stroke-[3]" />
                    Add New Block
                  </Button>
                ) : (
                  <div className="space-y-4">
                    {/* Block Type Selection with Searchable Dropdown */}
                    <div>
                      <label className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${
                        presentationDarkMode ? 'text-white' : 'text-[#0A0A0F]'
                      }`}>Block Type</label>
                      <Popover open={blockTypeDropdownOpen} onOpenChange={setBlockTypeDropdownOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={blockTypeDropdownOpen}
                            className={`w-full justify-between rounded-none border-2 font-bold ${
                              presentationDarkMode 
                                ? 'bg-[#0A0A0F] border-[#333333] text-white hover:bg-[#1e1e32]' 
                                : 'bg-white border-[#0A0A0F] text-[#0A0A0F] hover:bg-gray-50'
                            }`}
                          >
                            {selectedBlockType ? (
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const selectedType = LAYER_TYPES.find(t => t.type === selectedBlockType);
                                  const iconName = getIconForBlockType(selectedBlockType);
                                  const IconComponent = (Icons as any)[iconName] || Icons.Square;
                                  return (
                                    <>
                                      <IconComponent className="w-4 h-4" />
                                      <span>{selectedType?.label}</span>
                                    </>
                                  );
                                })()}
                              </div>
                            ) : (
                              "Select block type..."
                            )}
                            <Icons.ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className={`w-[280px] p-0 rounded-none border-2 shadow-[4px_4px_0px_0px] ${
                          presentationDarkMode ? 'bg-[#12121A] border-[#333333] shadow-[#333333]' : 'bg-white border-[#0A0A0F] shadow-[#0A0A0F]'
                        }`}>
                          <Command className={presentationDarkMode ? 'bg-gray-800' : ''}>
                            <CommandInput placeholder="Search block types..." className={
                              presentationDarkMode ? 'text-gray-200 placeholder-gray-400' : ''
                            } />
                            <CommandList>
                              <CommandEmpty>No block type found.</CommandEmpty>
                              <CommandGroup>
                                {LAYER_TYPES.map((type) => {
                                  const iconName = getIconForBlockType(type.type);
                                  const IconComponent = (Icons as any)[iconName] || Icons.Square;
                                  return (
                                    <CommandItem
                                      key={type.type}
                                      value={type.label}
                                      onSelect={() => {
                                        setSelectedBlockType(type.type);
                                        setBlockTypeDropdownOpen(false);
                                      }}
                                      className={`flex items-center gap-2 ${
                                        presentationDarkMode ? 'text-gray-200 hover:bg-gray-700' : ''
                                      }`}
                                    >
                                      <IconComponent className="w-4 h-4" />
                                      <span>{type.label}</span>
                                      <Icons.Check
                                        className={`ml-auto h-4 w-4 ${
                                          selectedBlockType === type.type ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    {/* Block Content - Only show if block type is selected */}
                    {selectedBlockType && (
                      <div>
                        <label className={`text-sm font-medium block mb-2 ${
                          presentationDarkMode ? 'text-gray-200' : 'text-gray-900'
                        }`}>Content</label>
                        <Textarea
                          value={newBlockContent}
                          onChange={(e) => setNewBlockContent(e.target.value)}
                          placeholder="Enter block content..."
                          className={`w-full h-20 text-sm ${
                            presentationDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400' 
                              : ''
                          }`}
                          autoFocus
                        />
                      </div>
                    )}
                    
                    {/* Action Buttons - Only show if block type is selected */}
                    {selectedBlockType && (
                      <div className="flex gap-2 pb-6">
                        <Button
                          onClick={handleAddBlock}
                          disabled={!selectedBlockType}
                          size="sm"
                          className="flex-1"
                        >
                          Add Block
                        </Button>
                        <Button
                          onClick={() => {
                            setAddBlockPopoverOpen(false);
                            setSelectedBlockType(null);
                            setNewBlockContent("");
                            setBlockTypeDropdownOpen(false);
                          }}
                          variant="ghost"
                          size="sm"
                          className={presentationDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700' : ''}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Custom scrollbar at the bottom */}
      <CustomScrollbar scrollContainer={scrollContainerRef.current} />
    </div>
  );
}
