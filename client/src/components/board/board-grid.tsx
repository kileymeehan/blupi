import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "react-beautiful-dnd";
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
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import Block from "./block";
import BlockDrawer from "./block-drawer";
import { CommentDialog } from "./comment-dialog";
import type {
  Board,
  Block as BlockType,
  Phase,
  Department,
} from "@shared/schema";
import { nanoid } from "nanoid";
import ImageUpload from "./image-upload";
import { CommentsOverview } from "./comments-overview";
import { useQuery } from "@tanstack/react-query";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { UserPlus, Link as LinkIcon } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { LAYER_TYPES } from "./constants";
import { DepartmentFilter } from "./department-filter";
import { SheetDocumentsManager } from "@/components/google-sheets/sheet-documents-manager";
import { FileSpreadsheet } from "lucide-react";

interface Attachment {
  type: "link" | "image" | "video";
  url: string;
}

interface BoardGridProps {
  id: string;
  onBlocksChange: (blocks: BlockType[]) => void;
  onPhasesChange: (phases: Phase[]) => void;
  onBoardChange: (board: Board) => void;
  connectedUsers: Array<{ id: string; name: string; color: string }>;
}

export default function BoardGrid({
  id,
  onBlocksChange,
  onPhasesChange,
  onBoardChange,
  connectedUsers,
}: BoardGridProps) {
  const [_, setLocation] = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
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
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [showDepartments, setShowDepartments] = useState(false);
  const [showGoogleSheets, setShowGoogleSheets] = useState(false);
  const [isModifierKeyPressed, setIsModifierKeyPressed] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState<
    Department | undefined
  >(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [showMinimap, setShowMinimap] = useState(false);
  const minimapRef = useRef<HTMLDivElement>(null);

  // Add keyboard event listeners for modifier keys (Cmd/Ctrl)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsModifierKeyPressed(true);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsModifierKeyPressed(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const {
    data: board,
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
    refetchInterval: 5000,
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

  const { data: project } = useQuery({
    queryKey: ["/api/projects", board?.projectId],
    queryFn: async () => {
      if (!board?.projectId) return null;
      const res = await fetch(`/api/projects/${board.projectId}`);
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json();
    },
    enabled: !!board?.projectId,
  });

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
    if (!result.destination) return;

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

      const blocks = Array.from(board.blocks);
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
      let blocks = Array.from(board.blocks);
      
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
      
      // Handle block duplication on modifier key
      if (isModifierKeyPressed) {
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
    const blocks = board.blocks.map((block) =>
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
    const blocks = board.blocks.map((block) =>
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

  const handleAttachmentChange = (
    blockId: string,
    attachments: Attachment[],
  ) => {
    const blocks = board.blocks.map((block) =>
      block.id === blockId ? { ...block, attachments } : block,
    );
    onBlocksChange(blocks);
  };

  const handleNotesChange = (blockId: string, notes: string) => {
    const blocks = board.blocks.map((block) =>
      block.id === blockId ? { ...block, notes } : block,
    );
    onBlocksChange(blocks);
  };

  const handleEmojiChange = (blockId: string, emoji: string) => {
    const blocks = board.blocks.map((block) =>
      block.id === blockId ? { ...block, emoji } : block,
    );
    onBlocksChange(blocks);
  };

  const handleDepartmentChange = (
    blockId: string,
    department: Department | undefined,
    customDepartment?: string,
  ) => {
    const blocks = board.blocks.map((block) =>
      block.id === blockId ? { ...block, department, customDepartment } : block,
    );
    onBlocksChange(blocks);
  };

  const handleAddColumn = (phaseIndex: number) => {
    const newPhases = [...board.phases];
    const newColumn: { id: string; name: string; image?: string | undefined } =
      {
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

  const handleColumnNameChange = (
    phaseIndex: number,
    columnIndex: number,
    name: string,
  ) => {
    const newPhases = [...board.phases];
    newPhases[phaseIndex].columns[columnIndex].name = name;
    onPhasesChange(newPhases);
  };

  const handleBoardNameChange = (name: string) => {
    onBoardChange({ ...board, name });
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
    newPhases[phaseIndex].columns[columnIndex].image = image || undefined;
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

    const uiElements = boardRef.current.querySelectorAll(".hide-in-pdf");
    uiElements.forEach((el) => el.classList.add("opacity-0"));

    try {
      await exportToPDF(boardRef.current, board.name);
    } finally {
      uiElements.forEach((el) => el.classList.remove("opacity-0"));
    }
  };

  const exportToPDF = async (boardRef: HTMLElement, boardName: string) => {
    const pdf = new jsPDF("landscape", "pt", "a4");

    const canvas = await html2canvas(boardRef, {
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
      ignoreElements: (element) => {
        return element.classList.contains("hide-in-pdf");
      },
    });

    const imgWidth = 842;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      0,
      0,
      imgWidth,
      imgHeight,
    );

    pdf.save(
      `${boardName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_blueprint.pdf`,
    );
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

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="h-20 border-b border-gray-300 px-8 flex justify-between items-center bg-gray-50 shadow-sm flex-shrink-0 sticky top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-4 pl-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-10 px-3 -ml-3"
          >
            <Home className="w-5 h-5 mr-2" />
            Home
          </Button>

          {project && (
            <>
              <div className="w-px h-6 bg-gray-200 mx-2" />
              <Button variant="ghost" size="sm" asChild className="h-10 px-3">
                <Link href={`/project/${project.id}`}>
                  <div className="flex items-center">
                    <Folder className="w-5 h-5 mr-2" />
                    {project.name}
                  </div>
                </Link>
              </Button>
            </>
          )}

          <div className="w-px h-6 bg-gray-200 mx-2" />

          <div className="group flex items-center gap-2">
            <div
              contentEditable
              onFocus={() => setIsEditingName(true)}
              onBlur={(e) => {
                setIsEditingName(false);
                handleBoardNameChange(e.currentTarget.textContent || "");
              }}
              className="text-2xl font-bold focus:outline-none focus:border-b border-primary"
              suppressContentEditableWarning={true}
            >
              {board.name}
            </div>
            <Pencil
              className={`w-4 h-4 text-gray-400 transition-opacity duration-200 ${isEditingName ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
            />
          </div>

          <div className="w-px h-6 bg-gray-200 mx-2" />
        </div>

        <div className="flex items-center">
          <UsersPresence users={connectedUsers} />
          <div className="w-px h-6 bg-gray-200 mx-3" />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMinimap(!showMinimap)}
              className="h-9 w-9 p-0"
              title="Toggle Board Overview"
            >
              <Map className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAddToProjectOpen(true)}
              className="h-9 w-9 p-0"
            >
              <FolderPlus className="w-4 h-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                  <ArrowUpFromLine className="w-4 h-4" />
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                  <UserCircle2 className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="w-4 h-4 mr-2" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
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
            className={`${isDrawerOpen ? "w-72" : "w-16"} bg-white border-r border-gray-300 flex-shrink-0 shadow-md transition-all duration-300 ease-in-out fixed top-20 left-0 bottom-0 z-40 h-auto flex flex-col overflow-y-auto`}
          >
            <div className="flex flex-col flex-grow overflow-hidden relative">
              {/* Always present toggle button in line with navigation */}
              <div className="border-b border-gray-200 bg-white shadow-sm py-0">
                <div className="h-12 flex items-center justify-end pr-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSidebar}
                    className="w-7 h-7 rounded-full bg-blue-100 shadow-md hover:bg-blue-200 flex items-center justify-center p-0"
                    style={{ boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}
                  >
                    {isDrawerOpen ? (
                      <ChevronLeft className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleContext}
                  className={`
                    w-full h-12 px-4
                    flex items-center gap-2
                    group
                    ${!isDrawerOpen ? "justify-center" : "justify-start"}
                    ${showContext ? "bg-blue-50 font-semibold" : "hover:bg-blue-50"}
                  `}
                >
                  <Info className="w-5 h-5" />
                  {isDrawerOpen && <span className="text-sm">Context</span>}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleBlocks}
                  className={`
                    w-full h-12 px-4
                    flex items-center gap-2
                    group
                    ${!isDrawerOpen ? "justify-center" : "justify-start"}
                    ${showBlocks ? "bg-blue-50 font-semibold" : "hover:bg-blue-50"}
                  `}
                >
                  <LayoutGrid className="w-5 h-5" />
                  {isDrawerOpen && (
                    <span className="text-sm">Available Boxes</span>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleComments}
                  className={`
                    w-full h-12 px-4
                    flex items-center gap-2
                    group
                    ${!isDrawerOpen ? "justify-center" : "justify-start"}
                    ${showComments ? "bg-blue-50 font-semibold" : "hover:bg-blue-50"}
                  `}
                >
                  <MessageSquare className="w-5 h-5" />
                  {isDrawerOpen && (
                    <span className="text-sm">All Comments</span>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleDepartments}
                  className={`
                    w-full h-12 px-4
                    flex items-center gap-2
                    group
                    ${!isDrawerOpen ? "justify-center" : "justify-start"}
                    ${showDepartments ? "bg-blue-50 font-semibold" : "hover:bg-blue-50"}
                  `}
                >
                  <Filter className="w-5 h-5" />
                  {isDrawerOpen && (
                    <span className="text-sm">Filters</span>
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleGoogleSheets}
                  className={`
                    w-full h-12 px-4
                    flex items-center gap-2
                    group
                    ${!isDrawerOpen ? "justify-center" : "justify-start"}
                    ${showGoogleSheets ? "bg-blue-50 font-semibold" : "hover:bg-blue-50"}
                  `}
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  {isDrawerOpen && (
                    <span className="text-sm">Sheets</span>
                  )}
                </Button>
              </div>

              {isDrawerOpen && (
                <div className="flex-1 flex flex-col bg-blue-50 max-h-[calc(100vh-8.5rem)] overflow-hidden">
                  <div className={`flex-1 overflow-y-auto ${showContext ? "block" : "hidden"}`}>
                    <div className="p-4 space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Blueprint Details
                        </label>
                        <Textarea
                          placeholder="Add key details about this blueprint..."
                          value={blueprintDetails}
                          onChange={(e) => setBlueprintDetails(e.target.value)}
                          className="min-h-[150px] resize-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium block">
                          Persona
                        </label>
                        <div
                          className="w-full h-40 bg-white rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                          onClick={() =>
                            document.getElementById("persona-image")?.click()
                          }
                        >
                          {personaImage ? (
                            <img
                              src={personaImage}
                              alt="Persona"
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <div className="text-center">
                              <Upload className="w-8 h-8 mx-auto text-gray-400" />
                              <span className="text-sm text-gray-500 mt-2 block">
                                Upload persona image
                              </span>
                            </div>
                          )}
                          <input
                            id="persona-image"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setPersonaImage(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </div>
                        <Textarea
                          placeholder="Describe the persona..."
                          value={personaDetails}
                          onChange={(e) => setPersonaDetails(e.target.value)}
                          className="min-h-[100px] resize-none mt-2"
                        />
                      </div>
                    </div>
                  </div>

                  <div className={`flex-1 overflow-y-auto ${showBlocks ? "block" : "hidden"}`}>
                    <Droppable droppableId="drawer" type="BLOCK">
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="p-4"
                        >
                          <BlockDrawer />
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>

                  <div
                    className={`flex-1 overflow-y-auto ${showComments ? "block" : "hidden"}`}
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
                  >
                    <DepartmentFilter
                      blocks={board.blocks}
                      onFilterByDepartment={setDepartmentFilter}
                      onFilterByType={setTypeFilter}
                      departmentFilter={departmentFilter}
                      typeFilter={typeFilter}
                    />
                  </div>
                  <div
                    className={`flex-1 overflow-y-auto ${showGoogleSheets ? "block" : "hidden"}`}
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
                                  <div key={`minimap-${column.id}`} className="flex-shrink-0 w-[225px] flex flex-col">
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
            <div className="min-w-[800px] relative">
              <div ref={boardRef} className="p-8 pt-4">
                <div className="flex items-start gap-8">
                  {board.phases.map((phase, phaseIndex) => (
                    <div 
                      key={phase.id}
                      id={`phase-${phase.id}`} 
                      className="flex-shrink-0 relative mr-8">
                      <div className="px-4">
                        <div className="mb-4 border-[2px] border-gray-700 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div
                              contentEditable
                              onBlur={(e) =>
                                handlePhaseNameChange(
                                  phaseIndex,
                                  e.currentTarget.textContent || "",
                                )
                              }
                              className="font-bold text-lg focus:outline-none focus:border-b border-primary"
                              suppressContentEditableWarning={true}
                            >
                              {phase.name}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddColumn(phaseIndex)}
                              className="h-7 px-2 border border-gray-100 hide-in-pdf"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Step
                            </Button>
                          </div>
                        </div>

                        <Droppable
                          droppableId={`phase-${phaseIndex}`}
                          direction="horizontal"
                          type="COLUMN"
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className="flex gap-8"
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
                                      className="flex-shrink-0 w-[225px] flex flex-col"
                                      style={{
                                        ...provided.draggableProps.style,
                                        zIndex: snapshot.isDragging ? 9999 : 'auto'
                                      }}
                                    >
                                      <div className="flex items-center gap-2 mb-2 mt-4">
                                        <div 
                                          {...provided.dragHandleProps}
                                          className="cursor-grab hover:text-gray-900 text-gray-600 p-1 -ml-1 rounded hover:bg-gray-100 active:cursor-grabbing"
                                          style={{
                                            cursor: snapshot.isDragging ? "grabbing" : "grab"
                                          }}
                                        >
                                          <GripVertical className="w-4 h-4" />
                                        </div>
                                        <div className="relative flex-1 group">
                                          <div
                                            contentEditable
                                            onBlur={(e) =>
                                              handleColumnNameChange(
                                                phaseIndex,
                                                columnIndex,
                                                e.currentTarget.textContent || "",
                                              )
                                            }
                                            className="text-xs font-bold focus:outline-none focus-visible:border-b focus-visible:border-primary h-8 overflow-y-auto whitespace-normal flex items-center"
                                            suppressContentEditableWarning={true}
                                            title={column.name}
                                          >
                                            {column.name}
                                          </div>
                                          {column.name && column.name.length > 25 && (
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
                                          className="h-6 w-6 p-0 hover:text-red-500 hide-in-pdf"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>

                                      <ImageUpload
                                        currentImage={column.image}
                                        onImageChange={(image) =>
                                          handleImageChange(
                                            phaseIndex,
                                            columnIndex,
                                            image,
                                          )
                                        }
                                      />

                                      <Droppable
                                        droppableId={`${phaseIndex}-${columnIndex}`}
                                        type="BLOCK"
                                      >
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={`
                                              space-y-4 min-h-[100px] p-4 rounded-lg border-1 border-gray-300 flex-1
                                              ${
                                                snapshot.isDraggingOver
                                                  ? "border-primary/50 bg-primary/5"
                                                  : "hover:border-gray-300"
                                              }
                                              transition-colors duration-200
                                            `}
                                          >
                                            {board.blocks
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
                                              )
                                              .map((block, index) => (
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
                                                    group relative rounded-lg border-3 border-gray-500 mb-2 p-2
                                                    transition-shadow duration-200
                                                    ${snapshot.isDragging ? "shadow-xl z-50" : "hover:shadow-md hover:border-gray-900"}
                                                    ${highlightedBlockId === block.id ? "ring-2 ring-primary ring-offset-2" : ""}
                                                  `}
                                                  style={{
                                                    ...provided.draggableProps.style,
                                                    zIndex: snapshot.isDragging ? 9999 : "auto"
                                                  }}
                                                >
                                                  {/* Create handles on the edges that are draggable but leave the center free for editing */}
                                                  <div className="absolute inset-0 pointer-events-none">
                                                    {/* Top handle */}
                                                    <div 
                                                      {...provided.dragHandleProps}
                                                      className="absolute top-0 left-0 right-0 h-6 pointer-events-auto cursor-grab active:cursor-grabbing"
                                                      style={{
                                                        cursor: snapshot.isDragging ? "grabbing" : "grab"
                                                      }}
                                                    >
                                                      {/* Visual indicator on hover */}
                                                      <div className="h-4 flex justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <GripVertical size={14} className="text-gray-400" />
                                                      </div>
                                                    </div>
                                                    
                                                    {/* Bottom handle */}
                                                    <div 
                                                      {...provided.dragHandleProps}
                                                      className="absolute bottom-0 left-0 right-0 h-6 pointer-events-auto cursor-grab active:cursor-grabbing"
                                                    ></div>
                                                    
                                                    {/* Left handle */}
                                                    <div 
                                                      {...provided.dragHandleProps}
                                                      className="absolute top-6 bottom-6 left-0 w-6 pointer-events-auto cursor-grab active:cursor-grabbing"
                                                    ></div>
                                                    
                                                    {/* Right handle */}
                                                    <div 
                                                      {...provided.dragHandleProps}
                                                      className="absolute top-6 bottom-6 right-0 w-6 pointer-events-auto cursor-grab active:cursor-grabbing"
                                                    ></div>
                                                  </div>
                                                  
                                                  <Block
                                                      block={block}
                                                      onChange={(content, newType) =>
                                                        handleBlockChange(
                                                          block.id,
                                                          content,
                                                          newType
                                                        )
                                                      }
                                                    onAttachmentChange={(
                                                      attachments,
                                                    ) =>
                                                      handleAttachmentChange(
                                                        block.id,
                                                        attachments,
                                                      )
                                                    }
                                                    onNotesChange={(notes) =>
                                                      handleNotesChange(
                                                        block.id,
                                                        notes,
                                                      )
                                                    }
                                                    onEmojiChange={(
                                                      blockId,
                                                      emoji,
                                                    ) =>
                                                      handleEmojiChange(
                                                        blockId,
                                                        emoji,
                                                      )
                                                    }
                                                    onDepartmentChange={
                                                      handleDepartmentChange
                                                    }
                                                    onSheetsConnectionChange={
                                                      handleSheetsConnectionChange
                                                    }
                                                    onCommentClick={() =>
                                                      handleCommentClick(block)
                                                    }
                                                    projectId={
                                                      board.projectId ||
                                                      undefined
                                                    }
                                                  />
                                                </div>
                                              )}
                                            </Draggable>
                                          ))}
                                        {provided.placeholder}
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
                      </div>
                    </div>
                  ))}
                  <div className="flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddPhase}
                      className="h-9 px-2 border border-gray-300"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Phase
                    </Button>
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
    </div>
  );
}
