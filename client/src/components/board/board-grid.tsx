import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import Block from "./block";
import BlockDrawer from "./block-drawer";
import type { Board, Block as BlockType, Phase } from "@shared/schema";
import { nanoid } from "nanoid";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { ErrorBoundary } from "@/components/error-boundary";

export const LAYER_TYPES = [
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
  const { logoutMutation } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const blocks = Array.from(board.blocks);

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

      blocks.push(newBlock);
      onBlocksChange(blocks);
      return;
    }

    // If reordering within or between columns
    const [sourcePhaseIndex, sourceColumnIndex] = result.source.droppableId.split('-').map(Number);
    const [destPhaseIndex, destColumnIndex] = result.destination.droppableId.split('-').map(Number);

    const sourceBlocks = blocks.filter(b => 
      b.phaseIndex === sourcePhaseIndex && 
      b.columnIndex === sourceColumnIndex
    );

    const [movedBlock] = sourceBlocks.splice(result.source.index, 1);

    const updatedBlock = {
      ...movedBlock,
      phaseIndex: destPhaseIndex,
      columnIndex: destColumnIndex
    };

    const remainingBlocks = blocks.filter(b => b.id !== movedBlock.id);
    remainingBlocks.splice(result.destination.index, 0, updatedBlock);
    onBlocksChange(remainingBlocks);
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
    <DragDropContext onDragEnd={handleDragEnd}>
      <div
        className={`relative bg-gray-50 border-r-2 border-gray-200 flex-shrink-0 shadow-lg transition-all duration-300 ease-in-out overflow-hidden
          ${isSidebarCollapsed ? 'w-0' : 'w-64'}`}
      >
        <div className="p-4 border-b border-gray-200 bg-white">
          <h3 className="font-medium">Block Types</h3>
          <p className="text-sm text-gray-500 mt-1">Drag blocks to add them to your board</p>
        </div>
        <Droppable droppableId="drawer" isDropDisabled={true}>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="p-6">
              <BlockDrawer />
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="absolute left-64 top-4 z-20 transform -translate-x-1/2 bg-white shadow-md rounded-full p-2"
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      >
        {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      <div className="flex-1 overflow-x-auto bg-gray-50">
        <div className="min-w-[800px]">
          <div className="px-8 py-4 border-b bg-white sticky top-0 z-10 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-sm font-medium hover:text-primary">
                <ChevronLeft className="w-4 h-4 inline-block mr-1" />
                Back to Home
              </Link>
              <h1 className="text-2xl font-bold">{board.name}</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              className="text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>

          <div className="p-8">
            <div className="flex gap-8">
              {board.phases.map((phase, phaseIndex) => (
                <div key={phase.id} className="min-w-[220px]">
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

                  <div className="flex gap-4">
                    {phase.columns.map((column, columnIndex) => (
                      <div key={column.id} className="w-[220px]">
                        <div
                          contentEditable
                          onBlur={(e) => handleColumnNameChange(phaseIndex, columnIndex, e.currentTarget.textContent || '')}
                          className="font-medium text-sm focus:outline-none focus:border-b border-primary mb-2"
                          suppressContentEditableWarning={true}
                        >
                          {column.name}
                        </div>

                        <Droppable droppableId={`${phaseIndex}-${columnIndex}`}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`space-y-3 min-h-[100px] p-2 rounded-lg border border-gray-100
                                ${snapshot.isDraggingOver ? 'bg-gray-50' : 'bg-white'}`}
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
                                        className={`${LAYER_TYPES.find(l => l.type === block.type)?.color} rounded-lg`}
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
  );
}