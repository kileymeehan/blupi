import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, FolderPlus } from "lucide-react";
import type { Board, Project } from "@shared/schema";
import CreateBoardDialog from "@/components/board/create-board-dialog";
import AddToProjectDialog from "@/components/board/add-to-project-dialog";
import { useState } from "react";
import { useAuth } from "@/hooks/use-simple-auth";

export default function Home() {
  const [_, setLocation] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [addToProjectOpen, setAddToProjectOpen] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<number>();
  const { user } = useAuth();

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"]
  });

  const { data: boards, isLoading: boardsLoading } = useQuery<Board[]>({
    queryKey: ["/api/boards"]
  });

  if (projectsLoading || boardsLoading) {
    return <div className="p-8">Loading...</div>;
  }

  const handleAddToProject = (boardId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBoardId(boardId);
    setAddToProjectOpen(true);
  };

  return (
    <div className="container mx-auto p-8">
      {/* Projects Section */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Projects</h1>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects?.map((project) => (
            <Card 
              key={project.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setLocation(`/project/${project.id}`)}
            >
              <CardHeader>
                <CardTitle>{project.name}</CardTitle>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Blueprints Section */}
      <div>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Blueprints</h2>
          <Button onClick={() => setCreateOpen(true)} variant="secondary">
            <Plus className="w-4 h-4 mr-2" />
            New Blueprint
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards?.map((board) => (
            <Card 
              key={board.id}
              className="group relative cursor-pointer hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div 
                    className="flex-1 hover:text-primary transition-colors"
                    onClick={() => setLocation(`/board/${board.id}`)}
                  >
                    <CardTitle>{board.name}</CardTitle>
                    <CardDescription>{board.description}</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleAddToProject(board.id, e)}
                  >
                    <FolderPlus className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      <CreateBoardDialog 
        open={createOpen} 
        onOpenChange={setCreateOpen}
      />

      {selectedBoardId && (
        <AddToProjectDialog
          open={addToProjectOpen}
          onOpenChange={setAddToProjectOpen}
          boardId={selectedBoardId}
        />
      )}
    </div>
  );
}