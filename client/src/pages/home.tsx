import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus } from "lucide-react";
import type { Board } from "@shared/schema";
import CreateBoardDialog from "@/components/board/create-board-dialog";
import { useState } from "react";

export default function Home() {
  const [_, setLocation] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  
  const { data: boards, isLoading } = useQuery<Board[]>({
    queryKey: ["/api/boards"]
  });

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Product Experience Blueprints</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Blueprint
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {boards?.map((board) => (
          <Card 
            key={board.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setLocation(`/board/${board.id}`)}
          >
            <CardHeader>
              <CardTitle>{board.name}</CardTitle>
              <CardDescription>{board.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <CreateBoardDialog 
        open={createOpen} 
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}
