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
import { format } from "date-fns";

export default function Dashboard() {
  const { user, logout } = useFirebaseAuth();
  const [, navigate] = useLocation();
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createBlueprintOpen, setCreateBlueprintOpen] = useState(false);

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

  // Sort boards by creation date, most recent first
  const sortedBoards = [...boards].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Get the 3 most recent boards
  const recentBoards = sortedBoards.slice(0, 3);

  // Get unassigned boards
  const unassignedBoards = boards.filter((board: any) => !board.projectId);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="border-b">
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
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
          <p className="text-muted-foreground mb-8">Manage your blueprints and projects</p>
        </div>

        {/* Recent Blueprints Section */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-6 w-6" />
              <h2 className="text-2xl font-semibold">Recent Blueprints</h2>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {recentBoards.map((board: any) => (
              <Card key={board.id}>
                <CardHeader>
                  <CardTitle>{board.name}</CardTitle>
                  <CardDescription>
                    {board.description}
                    {board.projectId && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Project: {projects.find(p => p.id === board.projectId)?.name}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      Created {format(new Date(board.createdAt), 'MMM d, yyyy')}
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" asChild className="w-full">
                    <Link href={`/board/${board.id}`}>View Blueprint</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator className="my-8" />

        {/* Blueprints Section */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-6 w-6" />
              <h2 className="text-2xl font-semibold">Unassigned Blueprints</h2>
            </div>
            <Button onClick={() => setCreateBlueprintOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Blueprint
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {unassignedBoards.map((board: any) => (
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

            {unassignedBoards.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Create your first blueprint</CardTitle>
                  <CardDescription>Start designing your workflow</CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </section>

        <Separator className="my-8" />

        {/* Projects Section */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Briefcase className="h-6 w-6" />
              <h2 className="text-2xl font-semibold">Projects</h2>
            </div>
            <Button onClick={() => setCreateProjectOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Project
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project: any) => (
              <Card key={project.id}>
                <CardHeader>
                  <CardTitle>{project.name}</CardTitle>
                  <CardDescription>{project.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <Button variant="outline" asChild className="w-full">
                    <Link href={`/project/${project.id}`}>View Project</Link>
                  </Button>
                  <Button asChild className="w-full">
                    <Link href={`/project/${project.id}/new`}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create New Blueprint
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}

            {projects.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Get started with a project</CardTitle>
                  <CardDescription>Create a project to organize your blueprints</CardDescription>
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
    </div>
  );
}