import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
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

      <main className="max-w-[1440px] mx-auto px-6 py-6 overflow-x-auto">
        <div className="flex gap-8 min-w-max pb-6">
          {board.phases.map((phase, phaseIndex) => (
            <div key={phase.id} className="w-[400px]">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{phase.name}</h2>
              <div className="space-y-4">
                {phase.columns.map((column, columnIndex) => (
                  <div key={column.id} className="bg-white rounded-lg p-4 border border-gray-300 shadow-md">
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
                            className="p-3 rounded-md bg-white border border-gray-200 shadow-sm"
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
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}