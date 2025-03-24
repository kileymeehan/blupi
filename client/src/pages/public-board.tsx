import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card } from "@/components/ui/card";
import { Info } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
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
    <div className="min-h-screen bg-background">
      <header className="h-16 border-b border-gray-300 px-8 flex items-center bg-gray-50 shadow-sm">
        <h1 className="text-4xl font-black tracking-tighter font-mono bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          BLUPE
        </h1>
        <div className="ml-4 flex items-center gap-2">
          <span className="text-xl font-semibold text-gray-700">{board.name}</span>
          <span className="text-sm text-muted-foreground">(Read-only view)</span>
        </div>
      </header>

      <div className="flex">
        <div className="w-72 bg-white border-r border-gray-300 shadow-md h-[calc(100vh-4rem)]">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5" />
              <span className="text-sm font-semibold">Context</span>
            </div>

            <div className="space-y-4">
              <Card className="p-4">
                <h3 className="text-sm font-medium mb-2">Blueprint Details</h3>
                <Textarea
                  value={board.description || "No description available"}
                  readOnly
                  className="min-h-[100px] resize-none bg-gray-50"
                />
              </Card>
            </div>
          </div>
        </div>

        <div className="flex-1 p-8">
          <div className="grid gap-4">
            {board.phases.map((phase, phaseIndex) => (
              <div key={phase.id} className="space-y-4">
                <h2 className="text-lg font-semibold">{phase.name}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {phase.columns.map((column, columnIndex) => (
                    <Card key={column.id} className="p-4">
                      <h3 className="text-sm font-medium mb-2">{column.name}</h3>
                      {column.image && (
                        <img 
                          src={column.image} 
                          alt={column.name}
                          className="w-full h-32 object-cover rounded-md mb-2"
                        />
                      )}
                      <div className="space-y-2">
                        {board.blocks
                          .filter(b => b.phaseIndex === phaseIndex && b.columnIndex === columnIndex)
                          .map(block => (
                            <div
                              key={block.id}
                              className="p-2 rounded-md bg-gray-50 text-sm"
                            >
                              {block.content}
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