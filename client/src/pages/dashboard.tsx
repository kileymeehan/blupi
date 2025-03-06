import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Plus, LogOut, User, LayoutGrid, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { CreateBlueprintDialog } from "@/components/create-blueprint-dialog";
import AddToProjectDialog from "@/components/board/add-to-project-dialog";
import { format } from "date-fns";

export default function Dashboard() {
  const { user, logout } = useFirebaseAuth();
  const [, navigate] = useLocation();
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createBlueprintOpen, setCreateBlueprintOpen] = useState(false);
  const [addToProjectOpen, setAddToProjectOpen] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json();
    }
  });

  const { data: boards = [] } = useQuery({
    queryKey: ['/api/boards'],
    queryFn: async () => {
      const res = await fetch('/api/boards');
      if (!res.ok) throw new Error('Failed to fetch boards');
      return res.json();
    }
  });

  const sortedBoards = [...boards].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const recentBoards = sortedBoards.slice(0, 3);

  const unassignedBoards = boards.filter((board: any) => !board.projectId);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white shadow-sm">
        <div className="container flex h-16 items-center px-8">
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Dashboard</h2>
          </div>

          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative">
                  {user?.email}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={logout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container px-8 py-8">
        <div className="mb-12 bg-white rounded-lg p-8 shadow-sm">
          <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
          <p className="text-muted-foreground">Manage your blueprints and projects</p>
        </div>

        <section className="mb-12 bg-white rounded-lg p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Briefcase className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-semibold">Projects</h2>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCreateProjectOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create New Project
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project: any) => (
              <Card key={project.id} className="relative overflow-hidden border-l-4 hover:shadow-md transition-shadow">
                <div className="absolute inset-y-0 left-0" style={{ backgroundColor: project.color || '#4F46E5' }} />
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{project.name}</CardTitle>
                    <div className={`
                      px-2 py-1 text-xs font-medium rounded-full
                      ${project.status === 'complete' ? 'bg-green-100 text-green-700' : ''}
                      ${project.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : ''}
                      ${project.status === 'draft' ? 'bg-gray-100 text-gray-700' : ''}
                      ${project.status === 'review' ? 'bg-yellow-100 text-yellow-700' : ''}
                      ${!project.status ? 'bg-gray-100 text-gray-700' : ''}
                    `}>
                      {project.status || 'draft'}
                    </div>
                  </div>
                  <CardDescription>
                    {project.description}
                    <div className="mt-1 text-xs text-muted-foreground">
                      Created by {project.createdBy || 'Unknown'} on {format(new Date(project.createdAt), 'MMM d, yyyy')}
                    </div>
                  </CardDescription>
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

        <section className="mb-12 bg-white rounded-lg p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">Recent Blueprints</h2>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recentBoards.map((board: any) => {
              const project = projects.find(p => p.id === board.projectId);
              return (
                <Card key={board.id} className="relative overflow-hidden border-l-4 hover:shadow-md transition-shadow">
                  {project && (
                    <div className="absolute inset-y-0 left-0" style={{ backgroundColor: project.color || '#4F46E5' }} />
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
                        Created by {board.createdBy || 'Unknown'} on {format(new Date(board.createdAt), 'MMM d, yyyy')}
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

        <section className="mb-12 bg-white rounded-lg p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-semibold">Unassigned Blueprints</h2>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCreateBlueprintOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create New Blueprint
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {unassignedBoards.map((board: any) => {
              const assignedProject = projects.find(p => p.id === board.projectId);

              return (
                <Card key={board.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle>{board.name}</CardTitle>
                    <CardDescription>
                      {board.description}
                      <div className="mt-1 text-xs text-muted-foreground">
                        Created by {board.createdBy || 'Unknown'} on {format(new Date(board.createdAt), 'MMM d, yyyy')}
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
                          setSelectedBoardId(board.id);
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

            {unassignedBoards.length === 0 && (
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

      <AddToProjectDialog
        open={addToProjectOpen}
        onOpenChange={setAddToProjectOpen}
        boardId={selectedBoardId!}
      />
    </div>
  );
}