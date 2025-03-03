import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import Block from "./block";
import type { Board, Block as BlockType } from "@shared/schema";
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
  onAddColumn: () => void;
  onRemoveColumn: (index: number) => void;
}

export default function BoardGrid({ board, onBlocksChange, onAddColumn, onRemoveColumn }: BoardGridProps) {
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const blocks = Array.from(board.blocks);
    const [reorderedBlock] = blocks.splice(result.source.index, 1);

    const [newColIndex, newRowIndex] = result.destination.droppableId.split('-').map(Number);

    blocks.splice(result.destination.index, 0, {
      ...reorderedBlock,
      columnIndex: newColIndex,
      rowIndex: newRowIndex
    });

    onBlocksChange(blocks);
  };

  const handleBlockChange = (blockId: string, content: string) => {
    const blocks = board.blocks.map(block =>
      block.id === blockId ? { ...block, content } : block
    );
    onBlocksChange(blocks);
  };

  const handleAddBlock = (columnIndex: number, rowIndex: number, type: BlockType['type']) => {
    const newBlock: BlockType = {
      id: nanoid(),
      type,
      content: '',
      columnIndex,
      rowIndex
    };
    onBlocksChange([...board.blocks, newBlock]);
  };

  const handlePhaseNameChange = (index: number, content: string) => {
    const newPhases = [...(board.phases || [])];
    newPhases[index] = content;
    onBlocksChange([...board.blocks]); // Trigger an update
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        <div className="grid grid-cols-[200px_repeat(auto-fill,minmax(180px,1fr))] gap-4">
          {/* Layer labels */}
          <div className="space-y-4 pr-4 border-r border-gray-200">
            {LAYER_TYPES.map(layer => (
              <div key={layer.type} className="h-32 flex items-center justify-between">
                <span className="font-medium text-sm">{layer.label}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleAddBlock(0, LAYER_TYPES.indexOf(layer), layer.type)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Columns */}
          <DragDropContext onDragEnd={handleDragEnd}>
            {Array.from({ length: board.numColumns }).map((_, colIndex) => (
              <div key={colIndex} className="space-y-4">
                <div className="flex justify-between items-center h-8">
                  <div
                    contentEditable
                    onBlur={(e) => handlePhaseNameChange(colIndex, e.currentTarget.textContent || '')}
                    className="font-medium text-sm focus:outline-none focus:border-b border-primary"
                    suppressContentEditableWarning={true}
                  >
                    {board.phases?.[colIndex] || `Phase ${colIndex + 1}`}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => onRemoveColumn(colIndex)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {LAYER_TYPES.map((layer, rowIndex) => (
                  <Droppable
                    key={`${colIndex}-${rowIndex}`}
                    droppableId={`${colIndex}-${rowIndex}`}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`h-32 ${layer.color} rounded-lg p-2 relative group transition-colors`}
                      >
                        <div className="flex gap-2 flex-wrap">
                          {board.blocks
                            .filter(b => b.columnIndex === colIndex && b.rowIndex === rowIndex)
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
                                    className={`${layer.color}`}
                                  >
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
          </DragDropContext>

          {/* Add column button */}
          <div className="flex items-start pt-8 justify-center">
            <Button variant="outline" onClick={onAddColumn} className="h-8">
              <Plus className="w-4 h-4 mr-2" />
              Add Phase
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}