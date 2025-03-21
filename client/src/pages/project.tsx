import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { CreateBlueprintDialog } from "@/components/create-blueprint-dialog";
import { InviteProjectDialog } from "@/components/invite-project-dialog";
import { PageHeader } from "@/components/page-header";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Board } from "@shared/schema";
import { StatusSelector } from "@/components/status-selector";
import { useToast } from "@/hooks/use-toast";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import { ColorPicker } from "@/components/color-picker";

export default function Project() {
  const { id } = useParams();
  const [createBlueprintOpen, setCreateBlueprintOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const { toast } = useToast();

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['/api/projects', id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error('Failed to fetch project');
      return res.json();
    }
  });

  const { data: boards = [], isLoading: boardsLoading } = useQuery<Board[]>({
    queryKey: ['/api/projects', id, 'boards'],
    queryFn: async () => {
      console.log('Fetching boards for project:', id);
      const res = await fetch(`/api/projects/${id}/boards`);
      if (!res.ok) throw new Error('Failed to fetch boards');
      const projectBoards = await res.json();
      console.log('Received boards:', projectBoards);
      return projectBoards;
    },
    enabled: !!id
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (updates: { name?: string; status?: string; color?: string }) => {
      const res = await apiRequest(
        'PATCH',
        `/api/projects/${id}`,
        updates
      );
      if (!res.ok) throw new Error('Failed to update project');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', id] });
      toast({
        title: "Success",
        description: "Project updated successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateBoardStatus = useMutation({
    mutationFn: async ({ boardId, status }: { boardId: number; status: string }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/boards/${boardId}`,
        { status }
      );
      if (!response.ok) {
        throw new Error('Failed to update board status');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', id, 'boards'] });
      toast({
        title: "Success",
        description: "Board status updated successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading project...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={project?.name || 'Loading...'}
        description={project?.description}
        onTitleChange={async (newTitle) => {
          await updateProjectMutation.mutateAsync({ name: newTitle });
        }}
        rightContent={
          <div className="flex items-center gap-2">
            <ColorPicker
              color={project?.color || '#4F46E5'}
              onChange={(color) => updateProjectMutation.mutateAsync({ color })}
            />
            <StatusSelector
              type="project"
              value={project?.status}
              onChange={(status) => updateProjectMutation.mutateAsync({ status })}
              disabled={updateProjectMutation.isPending}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteProjectOpen(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <main className="max-w-[1440px] mx-auto px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Blueprints</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite
            </Button>
            <Button onClick={() => setCreateBlueprintOpen(true)} className="bg-amber-600 hover:bg-amber-700">
              <Plus className="mr-2 h-4 w-4" />
              Create New Blueprint
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <Card key={board.id} className="relative overflow-hidden flex flex-col">
              <div 
                className="absolute inset-y-0 left-0 w-1.5" 
                style={{ backgroundColor: project?.color || '#4F46E5' }} 
              />
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{board.name}</CardTitle>
                  <StatusSelector
                    type="board"
                    value={board.status}
                    onChange={(status) => updateBoardStatus.mutate({ boardId: board.id, status })}
                    disabled={updateBoardStatus.isPending}
                  />
                </div>
                <CardDescription>{board.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col h-full mt-auto">
                <div className="flex-grow"></div>
                <div className="flex flex-col gap-2">
                  <Button variant="ghost" asChild className="w-full border-2 border-gray-900 hover:bg-gray-100">
                    <Link href={`/board/${board.id}`}>View Blueprint</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {boards.length === 0 && !boardsLoading && (
            <Card className="border-2 border-dashed border-gray-300">
              <CardHeader>
                <CardTitle>No blueprints yet</CardTitle>
                <CardDescription>Create your first blueprint for this project</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </main>

      <CreateBlueprintDialog
        open={createBlueprintOpen}
        onOpenChange={setCreateBlueprintOpen}
        projectId={Number(id)}
      />

      <InviteProjectDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        projectId={Number(id)}
      />
      <DeleteProjectDialog
        open={deleteProjectOpen}
        onOpenChange={setDeleteProjectOpen}
        projectId={Number(id)}
        projectName={project?.name || ''}
      />
    </div>
  );
}