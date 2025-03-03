import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical } from "lucide-react";
import Block from "./block";
import type { Board, Block as BlockType, Phase } from "@shared/schema";
import { nanoid } from "nanoid";

const LAYER_TYPES = [
  { type: 'touchpoint', label: 'Touchpoints', color: 'bg-sky-100' },
  { type: 'role', label: 'Roles', color: 'bg-green-100' },
  { type: 'process', label: 'Processes', color: 'bg-pink-100' },
  { type: 'pitfall', label: 'Pitfalls', color: 'bg-red-100' },
  { type: 'policy', label: 'Policy', color: 'bg-orange-100' },
  { type: 'technology', label: 'Technology', color: 'bg-purple-100' },
  { type: 'rationale', label: 'Rationale', color: 'bg-indigo-100' },
  { type: 'question', label: 'Questions', color: 'bg-violet-100' },
  { type: 'note', label: 'Notes', color: 'bg-cyan-100' }
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
    const [reorderedBlock] = blocks.splice(result.source.index, 1);

    const [phaseIndex, columnIndex] = result.destination.droppableId.split('-').map(Number);

    blocks.splice(result.destination.index, 0, {
      ...reorderedBlock,
      phaseIndex,
      columnIndex
    });

    onBlocksChange(blocks);
  };

  const handleBlockChange = (blockId: string, content: string) => {
    const blocks = board.blocks.map(block =>
      block.id === blockId ? { ...block, content } : block
    );
    onBlocksChange(blocks);
  };

  const handleAddBlock = (block: BlockType) => {
    const newBlock: BlockType = {
      id: nanoid(),
      type: block.type,
      content: '',
      phaseIndex: block.phaseIndex,
      columnIndex: block.columnIndex
    };

    // Find all blocks in the same column and phase
    const columnBlocks = board.blocks.filter(
      b => b.phaseIndex === block.phaseIndex && b.columnIndex === block.columnIndex
    );

    onBlocksChange([...board.blocks, newBlock]);
  };

  const handleAddColumn = (phaseIndex: number) => {
    const newPhases = [...board.phases];
    newPhases[phaseIndex].columns.push({
      id: nanoid(),
      name: `Step ${newPhases[phaseIndex].columns.length + 1}`
    });
    onPhasesChange(newPhases);
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

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-8">
            {board.phases.map((phase, phaseIndex) => (
              <div key={phase.id} className="min-w-[220px]">
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

                {/* Columns */}
                <div className="flex gap-4">
                  {phase.columns.map((column, columnIndex) => (
                    <div key={column.id} className="w-[220px]">
                      {/* Column header */}
                      <div
                        contentEditable
                        onBlur={(e) => handleColumnNameChange(phaseIndex, columnIndex, e.currentTarget.textContent || '')}
                        className="font-medium text-sm focus:outline-none focus:border-b border-primary mb-2"
                        suppressContentEditableWarning={true}
                      >
                        {column.name}
                      </div>

                      {/* Blocks */}
                      <Droppable
                        droppableId={`${phaseIndex}-${columnIndex}`}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="space-y-4"
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
                                      className={`${LAYER_TYPES.find(l => l.type === block.type)?.color} group/block relative`}
                                    >
                                      <GripVertical className="w-4 h-4 absolute -top-2 right-0 opacity-0 group-hover/block:opacity-100 transition-opacity" />
                                      <Block
                                        block={block}
                                        onChange={handleBlockChange}
                                        onAdd={() => handleAddBlock(block)}
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
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}