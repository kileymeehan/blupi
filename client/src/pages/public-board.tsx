import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Board } from "@shared/schema";
import { Loader2 } from "lucide-react";

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
    <div className="min-h-screen bg-[#F8F8F8]">
      <header className="border-b bg-white shadow-sm">
        <div className="max-w-[1440px] mx-auto flex h-16 items-center px-6">
          <div className="flex items-center">
            <img src="/Blupi-logomark-blue.png" alt="Blupi" className="h-7" />
          </div>
          <div className="ml-4">
            <span className="text-xl font-semibold">{board.name}</span>
            <span className="text-sm text-muted-foreground ml-2">(Read-only view)</span>
          </div>
        </div>
      </header>

      <main className="min-w-[800px] p-8">
        <div className="flex items-start gap-8">
          {board.phases.map((phase, phaseIndex) => (
            <div key={phase.id} className="flex-shrink-0 relative mr-8">
              <div className="px-4">
                <div className="mb-4 border-[2px] border-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-lg">
                      {phase.name}
                    </div>
                  </div>
                </div>

                <div className="flex gap-8">
                  {phase.columns.map((column, columnIndex) => (
                    <div
                      key={column.id}
                      className="flex-shrink-0 w-[225px]"
                    >
                      <div className="mb-2">
                        <div className="font-medium text-sm">
                          {column.name}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {board.blocks
                          .filter(b => b.phaseIndex === phaseIndex && b.columnIndex === columnIndex)
                          .map(block => (
                            <div
                              key={block.id}
                              className="p-3 rounded-md bg-white border border-gray-200 shadow-sm relative"
                              style={{
                                borderLeftWidth: '4px',
                                borderLeftColor: 
                                  block.department === 'Design' ? '#FF8BAE' :
                                  block.department === 'Engineering' ? '#98E2C6' :
                                  block.department === 'Product' ? '#93C5FD' :
                                  block.department === 'Sales' ? '#C4B5FD' :
                                  block.department === 'Marketing' ? '#FCD34D' :
                                  '#E5E7EB'
                              }}
                            >
                              <div className="flex items-start gap-2">
                                <div className="flex-1">
                                  <div className="text-sm font-medium mb-1">{block.content}</div>
                                  {block.department && (
                                    <div className="text-xs font-medium text-gray-500">
                                      {block.department}
                                    </div>
                                  )}
                                </div>
                              </div>
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
      </main>
    </div>
  );
}