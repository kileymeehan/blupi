import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Board } from "@shared/schema";
import { Loader2, Info } from "lucide-react";
import Block from "@/components/board/block";
import { LAYER_TYPES } from "@/components/board/constants";

export default function PublicBoard() {
  const { id } = useParams<{ id: string }>();

  const { data: board, isLoading, error } = useQuery<Board>({
    queryKey: ['/api/boards', id, 'public'],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${id}/public`);
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("Too many requests. Please wait a moment before trying again.");
        }
        throw new Error('Failed to fetch board');
      }
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <div className="text-lg">Loading blueprint...</div>
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-2">
            {error instanceof Error ? error.message : 'Failed to load blueprint'}
          </div>
          <div className="text-sm text-gray-600">Please try again later</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0EEE9]">
      <header className="border-b bg-white shadow-sm">
        <div className="max-w-[1440px] mx-auto flex h-16 items-center px-6">
          <div className="flex items-center">
            <img src="/Blupi-logomark-blue.png" alt="Blupi" className="h-7" />
          </div>
          <div className="ml-4">
            <span className="text-base font-bold" style={{fontSize: '1.1rem'}}>{board.name}</span>
            <span className="text-sm text-muted-foreground ml-2">(Read-only view)</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 bg-white border-r border-gray-300 flex-shrink-0 shadow-md min-h-[calc(100vh-4rem)] flex flex-col">
          <div className="flex flex-col flex-grow">
            <div className="border-b border-gray-200 bg-white shadow-sm">
              <div className="w-full h-12 px-4 flex items-center gap-2 bg-blue-50 font-semibold">
                <Info className="w-5 h-5" />
                <span className="text-sm">Context</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col bg-blue-50">
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Blueprint Details
                  </label>
                  <div className="min-h-[150px] bg-white rounded-lg border border-gray-300 p-3 text-sm">
                    {board.description || "No details available"}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium block">
                    Segments
                  </label>
                  <div className="min-h-[100px] bg-white rounded-lg border border-gray-300 p-3 text-sm">
                    {board.segments || "No segments defined"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto bg-white">
          <div className="min-w-max p-8">
            <div className="flex items-start gap-8">
              {board.phases.map((phase, phaseIndex) => (
                <div key={phase.id} className="flex-shrink-0 relative">
                  <div className="px-4">
                    <div className="mb-4 border-[2px] border-gray-700 rounded-lg p-3 bg-white">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-lg text-center w-full">
                          {phase.name}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-6">
                      {phase.columns.map((column, columnIndex) => (
                        <div
                          key={column.id}
                          className="flex-shrink-0 w-[280px]"
                        >
                          <div className="mb-3">
                            <div className="font-medium text-sm text-center bg-gray-100 p-2 rounded">
                              {column.name}
                            </div>
                          </div>

                          <div className="space-y-3 min-h-[200px]">
                            {board.blocks
                              .filter(b => b.phaseIndex === phaseIndex && b.columnIndex === columnIndex)
                              .map(block => (
                                <div
                                  key={block.id}
                                  className={`${LAYER_TYPES.find(l => l.type === block.type)?.color || 'bg-gray-100'} group relative rounded-lg border-2 border-gray-300 p-3`}
                                >
                                  <Block
                                    block={{
                                      ...block,
                                      readOnly: true
                                    }}
                                    boardId={parseInt(id!)}
                                    isTemplate={false}
                                  />
                                </div>
                              ))}
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
  );
}