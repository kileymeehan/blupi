import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Plus, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function Dashboard() {
  const { user, logout } = useFirebaseAuth();

  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json();
    }
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="border-b">
        <div className="container flex h-16 items-center px-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Dashboard</h2>
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative">
                  {user?.email}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
            <p className="text-muted-foreground">Manage your projects and blueprints</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                <CardTitle>No projects yet</CardTitle>
                <CardDescription>Create your first project to get started</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Blueprint
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}