import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, Image, Home, LayoutGrid, UserCircle2, LogIn, Share2, Pencil, Trash2, MessageSquare, ChevronLeft, ChevronRight, FolderPlus, Info, Upload, Briefcase } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import Block from "./block";
import BlockDrawer from "./block-drawer";
import { CommentDialog } from "./comment-dialog";
import type { Board, Block as BlockType, Phase } from "@shared/schema";
import { nanoid } from "nanoid";
import ImageUpload from './image-upload';
import { CommentsOverview } from "./comments-overview";
import { useQuery } from '@tanstack/react-query';
import AddToProjectDialog from "./add-to-project-dialog";

interface ColumnWithImage {
  id: string;
  name: string;
  image?: string;
}

interface PhaseWithImages {
  id: string;
  name: string;
  columns: ColumnWithImage[];
}

export const LAYER_TYPES = [
  { type: 'touchpoint', label: 'Touchpoints', color: 'bg-sky-200' },
  { type: 'role', label: 'Roles', color: 'bg-green-200' },
  { type: 'process', label: 'Processes', color: 'bg-pink-200' },
  { type: 'pitfall', label: 'Pitfalls', color: 'bg-red-200' },
  { type: 'policy', label: 'Policy', color: 'bg-orange-200' },
  { type: 'technology', label: 'Technology', color: 'bg-purple-200' },
  { type: 'rationale', label: 'Rationale', color: 'bg-indigo-200' },
  { type: 'question', label: 'Questions', color: 'bg-violet-200' },
  { type: 'note', label: 'Notes', color: 'bg-cyan-200' }
] as const;

interface BoardGridProps {
  id: string;
  onBlocksChange: (blocks: BlockType[]) => void;
  onPhasesChange: (phases: PhaseWithImages[]) => void;
  onBoardChange: (board: Board) => void;
}

export default function BoardGrid({ id, onBlocksChange, onPhasesChange, onBoardChange }: BoardGridProps) {
  const [_, setLocation] = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<BlockType | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showBlocks, setShowBlocks] = useState(true);
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);
  const [addToProjectOpen, setAddToProjectOpen] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [blueprintDetails, setBlueprintDetails] = useState("");
  const [personaDetails, setPersonaDetails] = useState("");
  const [personaImage, setPersonaImage] = useState<string | null>(null);

  const { data: board, isLoading: boardLoading, error } = useQuery({
    queryKey: ['/api/boards', id],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${id}`);
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("Too many requests. Please wait a moment before trying again.");
        }
        throw new Error('Failed to fetch board');
      }
      return res.json();
    },
    refetchInterval: 5000,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("Too many requests")) {
        return false;
      }
      return failureCount < 3;
    },
    gcTime: 1000 * 60 * 5,
  });

  const { data: project } = useQuery({
    queryKey: ['/api/projects', board?.projectId],
    queryFn: async () => {
      if (!board?.projectId) return null;
      const res = await fetch(`/api/projects/${board.projectId}`);
      if (!res.ok) throw new Error('Failed to fetch project');
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
          <div className="text-sm text-gray-600">Please wait a moment and try again</div>
        </div>
      </div>
    );
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, type } = result;

    if (type === 'COLUMN') {
      const sourcePhaseIndex = Number(source.droppableId.split('-')[1]);
      const destPhaseIndex = Number(destination.droppableId.split('-')[1]);

      const newPhases = Array.from(board.phases);
      const sourcePhase = newPhases[sourcePhaseIndex];
      const destPhase = newPhases[destPhaseIndex];

      const [movedColumn] = sourcePhase.columns.splice(source.index, 1);
      destPhase.columns.splice(destination.index, 0, movedColumn);

      const blocks = Array.from(board.blocks);
      blocks.forEach(block => {
        if (block.phaseIndex === sourcePhaseIndex && block.columnIndex === source.index) {
          block.phaseIndex = destPhaseIndex;
          block.columnIndex = destination.index;
        } else {
          if (block.phaseIndex === sourcePhaseIndex && block.columnIndex > source.index) {
            block.columnIndex--;
          }
          if (block.phaseIndex === destPhaseIndex && block.columnIndex >= destination.index) {
            block.columnIndex++;
          }
        }
      });

      onPhasesChange(newPhases);
      onBlocksChange(blocks);
      return;
    }

    if (!type || type === 'DEFAULT') {
      const blocks = Array.from(board.blocks);

      if (destination.droppableId === 'drawer') {
        const updatedBlocks = blocks.filter(b => b.id !== result.draggableId);
        onBlocksChange(updatedBlocks);
        return;
      }

      if (source.droppableId === 'drawer') {
        const blockType = result.draggableId.replace('drawer-', '');
        const [phaseIndex, columnIndex] = destination.droppableId.split('-').map(Number);

        const newBlock: BlockType = {
          id: nanoid(),
          type: blockType as BlockType['type'],
          content: '',
          phaseIndex,
          columnIndex,
          comments: []
        };

        blocks.splice(destination.index, 0, newBlock);
        onBlocksChange(blocks);
        return;
      }

      const [movedBlock] = blocks.splice(source.index, 1);
      const [phaseIndex, columnIndex] = destination.droppableId.split('-').map(Number);

      const updatedBlock = {
        ...movedBlock,
        phaseIndex,
        columnIndex
      };

      blocks.splice(destination.index, 0, updatedBlock);
      onBlocksChange(blocks);
    }
  };

  const handleBlockChange = (blockId: string, content: string) => {
    const blocks = board.blocks.map(block =>
      block.id === blockId ? { ...block, content } : block
    );
    onBlocksChange(blocks);
  };

  const handleAddColumn = (phaseIndex: number) => {
    const newPhases = [...board.phases];
    const newColumn: ColumnWithImage = {
      id: nanoid(),
      name: `Step ${newPhases[phaseIndex].columns.length + 1}`,
      image: undefined
    };

    newPhases[phaseIndex].columns.push(newColumn);
    onPhasesChange(newPhases);
  };

  const handleAddPhase = () => {
    const newPhases = [...board.phases];
    newPhases.push({
      id: nanoid(),
      name: `Phase ${newPhases.length + 1}`,
      columns: [{
        id: nanoid(),
        name: 'Step 1',
        image: undefined
      }]
    });

    onPhasesChange(newPhases);
  };

  const handlePhaseNameChange = (phaseIndex: number, name: string) => {
    const newPhases = [...board.phases];
    newPhases[phaseIndex].name = name;
    onPhasesChange(newPhases);
  };

  const handleColumnNameChange = (phaseIndex: number, columnIndex: number, name: string) => {
    const newPhases = [...board.phases];
    newPhases[phaseIndex].columns[columnIndex].name = name;
    onPhasesChange(newPhases);
  };

  const handleBoardNameChange = (name: string) => {
    onBoardChange({ ...board, name });
  };

  const handleClose = () => {
    setLocation('/');
  };

  const handleImageChange = (phaseIndex: number, columnIndex: number, image: string | null) => {
    const newPhases = [...board.phases];
    newPhases[phaseIndex].columns[columnIndex].image = image || undefined;
    onPhasesChange(newPhases);
  };

  const handleDeleteColumn = (phaseIndex: number, columnIndex: number) => {
    const newPhases = [...board.phases];
    newPhases[phaseIndex].columns.splice(columnIndex, 1);

    const newBlocks = board.blocks.filter(block =>
      !(block.phaseIndex === phaseIndex && block.columnIndex === columnIndex)
    ).map(block => {
      if (block.phaseIndex === phaseIndex && block.columnIndex > columnIndex) {
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

  const toggleBlocks = () => {
    if (showBlocks) {
      setShowBlocks(false);
    } else {
      setShowBlocks(true);
      setShowComments(false);
      if (!isDrawerOpen) {
        setIsDrawerOpen(true);
      }
    }
  };

  const toggleComments = () => {
    if (showComments) {
      setShowComments(false);
    } else {
      setShowComments(true);
      setShowBlocks(false);
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
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="h-20 border-b border-gray-300 px-8 flex justify-between items-center bg-gray-50 shadow-sm flex-shrink-0">
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
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="h-10 px-3"
              >
                <Link href={`/project/${project.id}`}>
                  <div className="flex items-center">
                    <Briefcase className="w-5 h-5 mr-2" />
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
                handleBoardNameChange(e.currentTarget.textContent || '');
              }}
              className="text-2xl font-bold focus:outline-none focus:border-b border-primary"
              suppressContentEditableWarning={true}
            >
              {board.name}
            </div>
            <Pencil className={`w-4 h-4 text-gray-400 transition-opacity duration-200 ${isEditingName ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAddToProjectOpen(true)}
            className="h-10 px-3"
          >
            <FolderPlus className="w-5 h-5 mr-2" />
            {project ? project.name : 'Add to Project'}
          </Button>
          <Button variant="ghost" size="sm" className="h-10 px-3">
            <Share2 className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-10 px-3">
            <UserCircle2 className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-10 px-3">
            <LogIn className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className={`${isDrawerOpen ? 'w-72' : 'w-16'} bg-white border-r border-gray-300 flex-shrink-0 shadow-md transition-all duration-300 ease-in-out relative h-[calc(100vh-5rem)]`}>
            <div className="flex flex-col h-full">
              <div className="border-b border-gray-200 bg-white shadow-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowContext(!showContext)}
                  className={`
                    w-full h-12 px-4
                    flex items-center gap-2
                    hover:bg-gray-100
                    ${!isDrawerOpen ? 'justify-center' : 'justify-start'}
                    ${showContext && isDrawerOpen ? 'bg-gray-100' : ''}
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
                    hover:bg-gray-100
                    ${!isDrawerOpen ? 'justify-center' : 'justify-start'}
                    ${showBlocks && isDrawerOpen ? 'bg-gray-100' : ''}
                  `}
                >
                  <LayoutGrid className="w-5 h-5" />
                  {isDrawerOpen && <span className="text-sm">Available Boxes</span>}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleComments}
                  className={`
                    w-full h-12 px-4
                    flex items-center gap-2
                    hover:bg-gray-100
                    ${!isDrawerOpen ? 'justify-center' : 'justify-start'}
                    ${showComments && isDrawerOpen ? 'bg-gray-100' : ''}
                  `}
                >
                  <MessageSquare className="w-5 h-5" />
                  {isDrawerOpen && <span className="text-sm">All Comments</span>}
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="absolute top-2 -right-4 w-8 h-8 rounded-full bg-white shadow-md z-50 hover:bg-gray-100"
              >
                {isDrawerOpen ? (
                  <ChevronLeft className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>

              {isDrawerOpen && (
                <div className="flex-1 overflow-hidden">
                  <div className="h-full">
                    <div className={`
                      h-full overflow-y-auto
                      ${showContext ? 'block' : 'hidden'}
                      bg-blue-50 p-4
                    `}>
                      <div className="space-y-4">
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
                            onClick={() => document.getElementById('persona-image')?.click()}
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

                    <div className={`
                      h-full overflow-y-auto
                      ${showBlocks ? 'block' : 'hidden'}
                      bg-blue-50
                    `}>
                      <Droppable droppableId="drawer">
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="p-4"
                            style={{ position: 'relative', zIndex: 20 }}
                          >
                            <BlockDrawer />
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>

                    <div className={`
                      h-full overflow-y-auto
                      ${showComments ? 'block' : 'hidden'}
                      bg-blue-50
                    `}>
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
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <div className="min-w-[800px] p-8">
              <div className="flex items-start">
                {board.phases.map((phase, phaseIndex) => (
                  <div key={phase.id} className="flex-shrink-0 relative mr-8">
                    {phaseIndex > 0 && (
                      <div className="absolute -left-4 top-0 bottom-0 w-[1px] bg-gray-200" />
                    )}
                    <div className="px-4">
                      <div className="mb-4 bg-gray-100 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div
                            contentEditable
                            onBlur={(e) => handlePhaseNameChange(phaseIndex, e.currentTarget.textContent || '')}
                            className="font-bold text-lg focus:outline-none focus:border-b border-primary"
                            suppressContentEditableWarning={true}
                          >
                            {phase.name}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddColumn(phaseIndex)}
                            className="h-7 px-2 border border-gray-300"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Step
                          </Button>
                        </div>
                      </div>

                      <Droppable droppableId={`phase-${phaseIndex}`} type="COLUMN" direction="horizontal">
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="flex gap-8"
                          >
                            {phase.columns.map((column, columnIndex) => (
                              <Draggable
                                key={column.id}
                                draggableId={`column-${column.id}`}
                                index={columnIndex}
                              >
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className="flex-shrink-0 w-[225px]"
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <div
                                        {...provided.dragHandleProps}
                                        className="cursor-grab hover:text-gray-700 text-gray-400 p-1 -ml-1 rounded hover:bg-gray-100 active:cursor-grabbing"
                                      >
                                        <GripVertical className="w-4 h-4" />
                                      </div>
                                      <div
                                        contentEditable
                                        onBlur={(e) => handleColumnNameChange(phaseIndex, columnIndex, e.currentTarget.textContent || '')}
                                        className="font-medium text-sm focus:outline-none focus-visible:border-b focus-visible:border-primary flex-1"
                                        suppressContentEditableWarning={true}
                                      >
                                        {column.name}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteColumn(phaseIndex, columnIndex)}
                                        className="h-6 w-6 p-0 hover:text-red-500"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>

                                    <ImageUpload
                                      currentImage={column.image}
                                      onImageChange={(image) => handleImageChange(phaseIndex, columnIndex, image)}
                                    />

                                    <Droppable droppableId={`${phaseIndex}-${columnIndex}`}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.droppableProps}
                                          className={`
                                            space-y-2 min-h-[100px] p-4
                                            rounded-lg bg-white border-2
                                            transition-all duration-200 ease-in-out
                                            ${snapshot.isDraggingOver ? 'border-primary bg-primary/5' : 'border-gray-200'}
                                          `}
                                          style={{
                                            minHeight: '100px',
                                          }}
                                        >
                                          {board.blocks
                                            .filter(b => b.phaseIndex === phaseIndex && b.columnIndex === columnIndex)
                                            .map((block, index) => (
                                              <Draggable
                                                key={block.id}
                                                draggableId={block.id}
                                                index={index}
                                              >
                                                {(provided, snapshot) => (
                                                  <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className={`
                                                      ${LAYER_TYPES.find(l => l.type === block.type)?.color} 
                                                      relative rounded-lg z-10
                                                      transition-all duration-200 ease-in-out
                                                      transform
                                                      ${snapshot.isDragging ? 'shadow-lg scale-[1.02] rotate-1' : ''}
                                                      ${highlightedBlockId === block.id ? 'ring-2 ring-primary ring-offset-2' : ''}
                                                    `}
                                                    style={{
                                                      ...provided.draggableProps.style,
                                                      transition: snapshot.isDropAnimating
                                                        ? 'all 0.2s cubic-bezier(0.2, 0, 0, 1)'
                                                        : provided.draggableProps.style?.transition,
                                                    }}
                                                  >
                                                    <Block block={block} onChange={handleBlockChange} onCommentClick={() => handleCommentClick(block)} />
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

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddPhase}
                  className="mt-3 h-7 px-2 ml-4"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Phase
                </Button>
              </div>
            </div>
          </div>
        </DragDropContext>
      </div>

      {selectedBlock && (
        <CommentDialog
          open={commentDialogOpen}
          onOpenChange={setCommentDialogOpen}
          block={selectedBlock}
          boardId={board.id}
        />
      )}

      <AddToProjectDialog
        open={addToProjectOpen}
        onOpenChange={setAddToProjectOpen}
        boardId={board.id}
      />
    </div>
  );
}