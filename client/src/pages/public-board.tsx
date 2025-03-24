import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card } from "@/components/ui/card";
import { Info } from "lucide-react";
import { Board } from "@shared/schema";

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
        <div className="text-lg">Loading blueprint...</div>
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
        <div className="max-w-[1440px] mx-auto flex h-24 items-center px-6">
          <div className="flex-1 flex items-center gap-6">
            <div className="flex items-center">
              <img src="/Blupi-logomark-blue.png" alt="Blupi" className="h-7" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold">{board.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">(Read-only view)</p>
          </div>
          <div className="flex-1"></div>
        </div>
      </header>

      <div className="flex">
        <div className="w-72 bg-white border-r border-gray-300 shadow-md h-[calc(100vh-6rem)]">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5" />
              <span className="text-sm font-semibold">Context</span>
            </div>

            <div className="space-y-4">
              <Card className="p-4 border border-gray-300">
                <h3 className="text-sm font-medium mb-2">Blueprint Details</h3>
                <p className="text-sm text-muted-foreground">
                  {board.description || "No description available"}
                </p>
              </Card>
            </div>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-auto">
          <div className="grid gap-8">
            {board.phases.map((phase, phaseIndex) => (
              <div key={phase.id} className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">{phase.name}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {phase.columns.map((column, columnIndex) => (
                    <Card key={column.id} className="p-4 border border-gray-300 shadow-md hover:shadow-lg transition-all duration-200">
                      <h3 className="text-base font-medium mb-4 pb-2 border-b">{column.name}</h3>
                      {column.image && (
                        <img 
                          src={column.image} 
                          alt={column.name}
                          className="w-full h-32 object-cover rounded-md mb-4"
                        />
                      )}
                      <div className="space-y-3">
                        {board.blocks
                          .filter(b => b.phaseIndex === phaseIndex && b.columnIndex === columnIndex)
                          .map(block => (
                            <div
                              key={block.id}
                              className={`p-3 rounded-md bg-white border border-gray-200 shadow-sm`}
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
                                  <div className="text-sm font-medium">{block.content}</div>
                                  {block.notes && (
                                    <div className="mt-1 text-sm text-gray-600">{block.notes}</div>
                                  )}
                                  {block.department && (
                                    <div className="mt-2 text-xs font-medium text-gray-500">
                                      {block.department}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}