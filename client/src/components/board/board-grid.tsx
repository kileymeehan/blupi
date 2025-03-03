import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Block from "./block";
import BlockDrawer from "./block-drawer";
import type { Board, Block as BlockType, Phase } from "@shared/schema";
import { nanoid } from "nanoid";

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
  board: Board;
  onBlocksChange: (blocks: BlockType[]) => void;
  onPhasesChange: (phases: Phase[]) => void;
}

export default function BoardGrid({ board, onBlocksChange, onPhasesChange }: BoardGridProps) {
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const blocks = Array.from(board.blocks);

    // If dragging back to drawer, remove the block
    if (result.destination.droppableId === 'drawer') {
      const updatedBlocks = blocks.filter(b => b.id !== result.draggableId);
      onBlocksChange(updatedBlocks);
      return;
    }

    // If dragging from drawer to column
    if (result.source.droppableId === 'drawer') {
      const blockType = result.draggableId.replace('drawer-', '');
      const [phaseIndex, columnIndex] = result.destination.droppableId.split('-').map(Number);

      const newBlock: BlockType = {
        id: nanoid(),
        type: blockType as BlockType['type'],
        content: '',
        phaseIndex,
        columnIndex
      };

      blocks.splice(result.destination.index, 0, newBlock);
      onBlocksChange(blocks);
      return;
    }

    // If reordering within or between columns
    const [movedBlock] = blocks.splice(result.source.index, 1);
    const [phaseIndex, columnIndex] = result.destination.droppableId.split('-').map(Number);

    const updatedBlock = {
      ...movedBlock,
      phaseIndex,
      columnIndex
    };

    blocks.splice(result.destination.index, 0, updatedBlock);
    onBlocksChange(blocks);
  };

  const handleBlockChange = (blockId: string, content: string) => {
    const blocks = board.blocks.map(block =>
      block.id === blockId ? { ...block, content } : block
    );
    onBlocksChange(blocks);
  };

  const handleAddColumn = (phaseIndex: number) => {
    const newPhases = [...board.phases];
    const newColumn = {
      id: nanoid(),
      name: `Step ${newPhases[phaseIndex].columns.length + 1}`
    };

    newPhases[phaseIndex].columns.push(newColumn);
    onPhasesChange(newPhases);

    const newBlock: BlockType = {
      id: nanoid(),
      type: 'touchpoint',
      content: '',
      phaseIndex,
      columnIndex: newPhases[phaseIndex].columns.length - 1
    };

    onBlocksChange([...board.blocks, newBlock]);
  };

  const handleAddPhase = () => {
    const newPhases = [...board.phases];
    newPhases.push({
      id: nanoid(),
      name: `Phase ${newPhases.length + 1}`,
      columns: [{
        id: nanoid(),
        name: 'Step 1'
      }]
    });

    const newBlock: BlockType = {
      id: nanoid(),
      type: 'touchpoint',
      content: '',
      phaseIndex: newPhases.length - 1,
      columnIndex: 0
    };

    onPhasesChange(newPhases);
    onBlocksChange([...board.blocks, newBlock]);
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

  return (
    <div className="flex h-[calc(100vh-theme(spacing.32))]">
      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Block drawer with enhanced separation */}
        <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0 shadow-md">
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold truncate">{board.name}</h1>
          </div>
          <Droppable droppableId="drawer">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="p-4">
                <BlockDrawer />
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        {/* Board content with improved transitions */}
        <div className="flex-1 overflow-x-auto bg-gray-50">
          <div className="min-w-[800px]">
            <div className="p-8">
              <div className="flex gap-8">
                {board.phases.map((phase, phaseIndex) => (
                  <div key={phase.id} className="min-w-[225px]">
                    {/* Phase header */}
                    <div className="mb-4 bg-amber-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-3">
                        <div
                          contentEditable
                          onBlur={(e) => handlePhaseNameChange(phaseIndex, e.currentTarget.textContent || '')}
                          className="font-medium text-lg focus:outline-none focus:border-b border-primary"
                          suppressContentEditableWarning={true}
                        >
                          {phase.name}
                        </div>
                        {phaseIndex === board.phases.length - 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleAddPhase}
                            className="h-8 px-2"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Phase
                          </Button>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddColumn(phaseIndex)}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Step
                      </Button>
                    </div>

                    {/* Columns with smoother animations */}
                    <div className="flex gap-8"> {/* Increased gap from 4 to 8 */}
                      {phase.columns.map((column, columnIndex) => (
                        <div key={column.id} className="w-[225px]">
                          {/* Column header */}
                          <div
                            contentEditable
                            onBlur={(e) => handleColumnNameChange(phaseIndex, columnIndex, e.currentTarget.textContent || '')}
                            className="font-medium text-sm focus:outline-none focus:border-b border-primary mb-2"
                            suppressContentEditableWarning={true}
                          >
                            {column.name}
                          </div>

                          {/* Blocks with improved drop animation */}
                          <Droppable droppableId={`${phaseIndex}-${columnIndex}`}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="space-y-4 min-h-[100px] p-4 rounded-lg bg-white border border-gray-200 flex flex-col items-center"
                              >
                                {board.blocks
                                  .filter(b => b.phaseIndex === phaseIndex && b.columnIndex === columnIndex)
                                  .map((block, index) => (
                                    <Draggable
                                      key={block.id}
                                      draggableId={block.id}
                                      index={index}
                                    >
                                      {(provided) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className={`${LAYER_TYPES.find(l => l.type === block.type)?.color} group/block relative rounded-lg w-[205px] h-[100px] transform transition-all duration-300 ease-in-out will-change-transform`}
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
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}