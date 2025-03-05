import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { CreateBlueprintDialog } from "@/components/create-blueprint-dialog";
import { InviteProjectDialog } from "@/components/invite-project-dialog";
import { PageHeader } from "@/components/page-header";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Board } from "@shared/schema";

export default function Project() {
  const { id } = useParams();
  const [createBlueprintOpen, setCreateBlueprintOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['/api/projects', id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error('Failed to fetch project');
      return res.json();
    }
  });

  const { data: boards = [], isLoading: boardsLoading } = useQuery<Board[]>({
    queryKey: ['/api/boards'],
    queryFn: async () => {
      const res = await fetch('/api/boards');
      if (!res.ok) throw new Error('Failed to fetch boards');
      const allBoards = await res.json();
      // Ensure proper type comparison by converting both to numbers
      return allBoards.filter((board: Board) => board.projectId === Number(id));
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTitle })
      });
      if (!res.ok) throw new Error('Failed to update project');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', id] });
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
          await updateProjectMutation.mutateAsync(newTitle);
        }}
      />

      <main className="container px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Blueprints</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite
            </Button>
            <Button onClick={() => setCreateBlueprintOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Blueprint
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <Card key={board.id}>
              <CardHeader>
                <CardTitle>{board.name}</CardTitle>
                <CardDescription>{board.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild className="w-full">
                  <Link href={`/board/${board.id}`}>View Blueprint</Link>
                </Button>
              </CardContent>
            </Card>
          ))}

          {boards.length === 0 && !boardsLoading && (
            <Card>
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
    </div>
  );
}