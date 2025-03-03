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

    const [phaseIndex, columnIndex, rowIndex] = result.destination.droppableId.split('-').map(Number);

    blocks.splice(result.destination.index, 0, {
      ...reorderedBlock,
      phaseIndex,
      columnIndex,
      rowIndex
    });

    onBlocksChange(blocks);
  };

  const handleBlockChange = (blockId: string, content: string) => {
    const blocks = board.blocks.map(block =>
      block.id === blockId ? { ...block, content } : block
    );
    onBlocksChange(blocks);
  };

  const handleAddBlock = (phaseIndex: number, columnIndex: number, rowIndex: number, type: BlockType['type']) => {
    const newBlock: BlockType = {
      id: nanoid(),
      type,
      content: '',
      phaseIndex,
      columnIndex,
      rowIndex
    };
    onBlocksChange([newBlock, ...board.blocks]);
  };

  const handleAddColumn = (phaseIndex: number) => {
    const newPhases = [...board.phases];
    newPhases[phaseIndex].columns.push({
      id: nanoid(),
      name: `Column ${newPhases[phaseIndex].columns.length + 1}`
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
        name: 'Column 1'
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
        <div className="grid grid-cols-[200px_1fr] gap-4">
          {/* Layer labels */}
          <div className="space-y-4 pr-4 border-r border-gray-200">
            {LAYER_TYPES.map((layer, rowIndex) => (
              <div key={layer.type} className="h-32 flex items-center justify-between">
                <span className="font-medium text-sm">{layer.label}</span>
              </div>
            ))}
          </div>

          {/* Phases and Columns */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-6">
              {board.phases.map((phase, phaseIndex) => (
                <div key={phase.id} className="min-w-[220px]">
                  {/* Phase header */}
                  <div className="mb-4">
                    <div
                      contentEditable
                      onBlur={(e) => handlePhaseNameChange(phaseIndex, e.currentTarget.textContent || '')}
                      className="font-medium text-lg focus:outline-none focus:border-b border-primary mb-2"
                      suppressContentEditableWarning={true}
                    >
                      {phase.name}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddColumn(phaseIndex)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Column
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

                        {/* Layers */}
                        {LAYER_TYPES.map((layer, rowIndex) => (
                          <Droppable
                            key={`${phaseIndex}-${columnIndex}-${rowIndex}`}
                            droppableId={`${phaseIndex}-${columnIndex}-${rowIndex}`}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`h-32 ${layer.color} rounded-lg p-2 mb-4 relative group transition-colors
                                  ${rowIndex === 0 ? 'hover:ring-2 ring-primary ring-opacity-50 cursor-pointer' : ''}`}
                                onClick={() => {
                                  if (rowIndex === 0) {
                                    handleAddBlock(phaseIndex, columnIndex, rowIndex, layer.type);
                                  }
                                }}
                              >
                                <div className="flex gap-2 flex-wrap">
                                  {board.blocks
                                    .filter(b => b.phaseIndex === phaseIndex && b.columnIndex === columnIndex && b.rowIndex === rowIndex)
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
                                            className={`${layer.color} group/block relative`}
                                          >
                                            <GripVertical className="w-4 h-4 absolute -top-2 right-0 opacity-0 group-hover/block:opacity-100 transition-opacity" />
                                            <Block
                                              block={block}
                                              onChange={handleBlockChange}
                                            />
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                </div>
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Add phase button */}
              <div className="flex items-start pt-8">
                <Button variant="outline" onClick={handleAddPhase}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Phase
                </Button>
              </div>
            </div>
          </DragDropContext>
        </div>
      </div>
    </div>
  );
}