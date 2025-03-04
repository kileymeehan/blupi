import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, Image, Home, LayoutGrid, UserCircle2, LogIn, Share2, Pencil, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import Block from "./block";
import BlockDrawer from "./block-drawer";
import type { Board, Block as BlockType, Phase } from "@shared/schema";
import { nanoid } from "nanoid";
import ImageUpload from './image-upload';

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
  board: Board & { phases: PhaseWithImages[] };
  onBlocksChange: (blocks: BlockType[]) => void;
  onPhasesChange: (phases: PhaseWithImages[]) => void;
  onBoardChange: (board: Board) => void;
}

export default function BoardGrid({ board, onBlocksChange, onPhasesChange, onBoardChange }: BoardGridProps) {
  const [_, setLocation] = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, type } = result;

    // Handle column reordering
    if (type === 'COLUMN') {
      const sourcePhaseIndex = Number(source.droppableId.split('-')[1]);
      const destPhaseIndex = Number(destination.droppableId.split('-')[1]);

      const newPhases = Array.from(board.phases);
      const sourcePhase = newPhases[sourcePhaseIndex];
      const destPhase = newPhases[destPhaseIndex];

      // Remove column from source phase
      const [movedColumn] = sourcePhase.columns.splice(source.index, 1);

      // Add column to destination phase
      destPhase.columns.splice(destination.index, 0, movedColumn);

      // Update blocks to match new column positions
      const blocks = Array.from(board.blocks);
      blocks.forEach(block => {
        if (block.phaseIndex === sourcePhaseIndex && block.columnIndex === source.index) {
          // Update blocks that were in the moved column
          block.phaseIndex = destPhaseIndex;
          block.columnIndex = destination.index;
        } else {
          // Update indices for other blocks
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

    // Handle block drag and drop
    if (!type || type === 'DEFAULT') {
      const blocks = Array.from(board.blocks);

      // If dragging back to drawer, remove the block
      if (destination.droppableId === 'drawer') {
        const updatedBlocks = blocks.filter(b => b.id !== result.draggableId);
        onBlocksChange(updatedBlocks);
        return;
      }

      // If dragging from drawer to column
      if (source.droppableId === 'drawer') {
        const blockType = result.draggableId.replace('drawer-', '');
        const [phaseIndex, columnIndex] = destination.droppableId.split('-').map(Number);

        const newBlock: BlockType = {
          id: nanoid(),
          type: blockType as BlockType['type'],
          content: '',
          phaseIndex,
          columnIndex
        };

        blocks.splice(destination.index, 0, newBlock);
        onBlocksChange(blocks);
        return;
      }

      // If reordering within or between columns
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

    // Update blocks - remove blocks in the deleted column and adjust indices
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


  return (
    <div className="flex flex-col h-screen">
      {/* Fixed header bar */}
      <div className="h-20 border-b border-gray-300 px-8 flex justify-between items-center bg-gray-50 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4 pl-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-10 px-3 -ml-3"
          >
            <Home className="w-5 h-5" />
            Home
          </Button>

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

      {/* Content area with drawer and board */}
      <div className="flex flex-1 overflow-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          {/* Collapsible block drawer */}
          <div className={`${isDrawerOpen ? 'w-72' : 'w-16'} bg-white border-r border-gray-300 flex-shrink-0 shadow-md transition-[width] duration-300`}>
            <div className="p-4 border-b border-gray-300 flex justify-between items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className="h-10 w-10 p-2"
              >
                <LayoutGrid className={`w-5 h-5 transition-transform duration-300 ${isDrawerOpen ? 'rotate-0' : 'rotate-180'}`} />
              </Button>
            </div>
            {isDrawerOpen && (
              <Droppable droppableId="drawer">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="p-4 overflow-y-auto max-h-[calc(100vh-8rem)]">
                    <BlockDrawer />
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            )}
          </div>

          {/* Board content */}
          <div className="flex-1 overflow-x-auto">
            <div className="min-w-[800px] p-8">
              <div className="flex items-start">
                {board.phases.map((phase, phaseIndex) => (
                  <div key={phase.id} className="flex-shrink-0 relative mr-8">
                    {/* Phase separator */}
                    {phaseIndex > 0 && (
                      <div className="absolute -left-4 top-0 bottom-0 w-[1px] bg-gray-200" />
                    )}
                    <div className="px-4">
                      {/* Phase header */}
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

                      {/* Columns */}
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
                                    {/* Column header with drag handle */}
                                    <div className="flex items-center gap-2 mb-2">
                                      <div
                                        {...provided.dragHandleProps}
                                        className="cursor-grab hover:text-gray-700 text-gray-400"
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

                                    {/* Image upload */}
                                    <ImageUpload
                                      currentImage={column.image}
                                      onImageChange={(image) => handleImageChange(phaseIndex, columnIndex, image)}
                                    />

                                    {/* Blocks droppable area with improved drop target */}
                                    <Droppable droppableId={`${phaseIndex}-${columnIndex}`}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.droppableProps}
                                          className={`
                                            space-y-2 min-h-[100px] p-2 
                                            rounded-lg bg-white border-2 
                                            border-gray-200 flex flex-col items-center
                                            transition-colors duration-200
                                            ${snapshot.isDraggingOver ? 'bg-gray-50' : ''}
                                          `}
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
                                                      group/block relative rounded-lg 
                                                      w-[225px] h-[100px]
                                                      transition-transform duration-150
                                                      ${snapshot.isDragging ? 'shadow-lg scale-[1.02]' : ''}
                                                    `}
                                                    style={{
                                                      ...provided.draggableProps.style,
                                                      transition: snapshot.isDropAnimating
                                                        ? 'all 0.15s cubic-bezier(0.2, 0, 0, 1)'
                                                        : provided.draggableProps.style?.transition,
                                                    }}
                                                  >
                                                    <Block block={block} onChange={handleBlockChange} />
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

                {/* Add Phase button */}
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
    </div>
  );
}