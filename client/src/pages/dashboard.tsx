import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, LogOut, User, LayoutGrid, Folder, Trash2, Briefcase } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { CreateBlueprintDialog } from "@/components/create-blueprint-dialog";
import AddToProjectDialog from "@/components/board/add-to-project-dialog";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import { format } from "date-fns";
import { StatusSelector } from "@/components/status-selector";
import { Project, Board } from "@shared/schema"; 
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const ANIMAL_EMOJIS = ["🦊", "🐼", "🦁", "🐯", "🐨", "🐮", "🐷", "🐸", "🐙", "🦒", "🦘", "🦔", "🦦", "🦥", "🦡"];

function getAnimalEmoji(id: string): string {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ANIMAL_EMOJIS[Math.abs(hash) % ANIMAL_EMOJIS.length];
}

export default function Dashboard() {
  const { user, logout } = useFirebaseAuth();
  const [, navigate] = useLocation();
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createBlueprintOpen, setCreateBlueprintOpen] = useState(false);
  const [addToProjectOpen, setAddToProjectOpen] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<{id: number, name: string} | null>(null);
  const { toast } = useToast();

  const { data: projects = [], refetch: refetchProjects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  useEffect(() => {
    if (!projectToDelete) {
      Promise.all([
        queryClient.refetchQueries({ queryKey: ["/api/projects"] }),
        queryClient.refetchQueries({ queryKey: ["/api/boards"] })
      ]);
    }
  }, [projectToDelete]);

  const { data: boards = [], isLoading: boardsLoading } = useQuery<Board[]>({
    queryKey: ['/api/boards']
  });

  // Sort boards by creation date (newest first) and filter for recent/unassigned
  const sortedBoards = [...(boards || [])].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const recentBoards = sortedBoards.slice(0, 3);
  const unassignedBoards = (boards || []).filter(board => !board.projectId);

  const updateProjectStatus = useMutation({
    mutationFn: async ({ projectId, status }: { projectId: number; status: string }) => {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update project status');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: "Success",
        description: "Project status updated"
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
      const res = await fetch(`/api/boards/${boardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update blueprint status');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      toast({
        title: "Success",
        description: "Blueprint status updated"
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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white shadow-sm">
        <div className="max-w-[1440px] mx-auto flex h-16 items-center px-8">
          <div className="flex-1 flex items-center gap-8">
            <h1 className="text-4xl font-black tracking-tighter font-mono bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Blupi
            </h1>
            <h2 className="text-lg font-semibold text-muted-foreground">Dashboard</h2>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative flex items-center gap-2">
                  <span className="text-xl">{user ? getAnimalEmoji(user.uid) : '👤'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-8 py-8 space-y-8">
        <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
          <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
          <p className="text-muted-foreground">Manage your blueprints and projects</p>
        </div>

        <section className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Folder className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">Projects</h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCreateProjectOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Project
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id} className="relative overflow-hidden group hover:shadow-md transition-shadow">
                <div 
                  className="absolute inset-y-0 left-0 w-1.5" 
                  style={{ 
                    backgroundColor: project.color || '#4F46E5',
                    opacity: 1,
                    zIndex: 10 
                  }} 
                />
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setProjectToDelete({ id: project.id, name: project.name })}
                        className="text-muted-foreground hover:text-red-600 p-1 h-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <StatusSelector
                      type="project"
                      value={project.status}
                      onChange={(status) => updateProjectStatus.mutate({ projectId: project.id, status })}
                      disabled={updateProjectStatus.isPending}
                    />
                  </div>
                  <div className="mt-2">
                    <div className="text-sm text-muted-foreground">{project.description}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Created on {format(new Date(project.createdAt), 'MMM d, yyyy')}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href={`/project/${project.id}`}>View Project</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}

            {projects.length === 0 && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle>Get started with a project</CardTitle>
                  <CardDescription>Create a project to organize your blueprints</CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </section>

        <section className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">Recent Blueprints</h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCreateBlueprintOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Blueprint
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recentBoards.map((board) => {
              const project = projects.find(p => p.id === board.projectId);
              return (
                <Card key={board.id} className="relative overflow-hidden border-l-4 hover:shadow-md transition-shadow">
                  {project && (
                    <div className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: project.color || '#4F46E5', opacity: 1, zIndex: 10 }} />
                  )}
                  <CardHeader>
                    <CardTitle>{board.name}</CardTitle>
                    <CardDescription>
                      {board.description}
                      {project && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Project: {project.name}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-muted-foreground">
                        Created on {format(new Date(board.createdAt), 'MMM d, yyyy')}
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" asChild className="w-full">
                      <Link href={`/board/${board.id}`}>View Blueprint</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">Unassigned Blueprints</h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCreateBlueprintOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Blueprint
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {unassignedBoards.map((board) => {
              const assignedProject = projects.find(p => p.id === board.projectId);

              return (
                <Card key={board.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{board.name}</CardTitle>
                      <StatusSelector
                        type="board"
                        value={board.status}
                        onChange={(status) => updateBoardStatus.mutate({ boardId: board.id, status })}
                        disabled={updateBoardStatus.isPending}
                      />
                    </div>
                    <CardDescription>
                      {board.description}
                      <div className="mt-1 text-xs text-muted-foreground">
                        Created on {format(new Date(board.createdAt), 'MMM d, yyyy')}
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" asChild className="w-full">
                        <Link href={`/board/${board.id}`}>View Blueprint</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setSelectedBoardId(String(board.id));
                          setAddToProjectOpen(true);
                        }}
                      >
                        <Briefcase className="w-4 h-4 mr-2" />
                        {assignedProject ? `Assigned to ${assignedProject.name}` : 'Add to Project'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {unassignedBoards.length === 0 && !boardsLoading && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle>Create your first blueprint</CardTitle>
                  <CardDescription>Start designing your workflow</CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </section>
      </main>

      <CreateProjectDialog 
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
      />

      <CreateBlueprintDialog
        open={createBlueprintOpen}
        onOpenChange={setCreateBlueprintOpen}
      />

      {selectedBoardId && (
        <AddToProjectDialog
          open={addToProjectOpen}
          onOpenChange={setAddToProjectOpen}
          boardId={Number(selectedBoardId)}
        />
      )}

      {projectToDelete && (
        <DeleteProjectDialog
          open={projectToDelete !== null}
          onOpenChange={(open) => {
            if (!open) {
              setProjectToDelete(null);
            }
          }}
          projectId={projectToDelete.id}
          projectName={projectToDelete.name}
        />
      )}
    </div>
  );
}