import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus,
  LogOut,
  User,
  LayoutGrid,
  Folder,
  Archive,
  Briefcase,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { CreateBlueprintDialog } from "@/components/create-blueprint-dialog";
import AddToProjectDialog from "@/components/board/add-to-project-dialog";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import { format } from "date-fns";
import { StatusSelector } from "@/components/status-selector";
import { Project, Board } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ProfileIcon } from "@/components/profile-icon";
import { ColorPicker } from "@/components/color-picker";

// Loading skeleton component for projects/boards
function LoadingSkeleton({ count = 3 }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array(count)
        .fill(null)
        .map((_, i) => (
          <Card key={i} className="relative overflow-hidden border border-gray-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="space-y-2 mt-2">
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-9 w-full bg-gray-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
    </div>
  );
}

const ANIMAL_EMOJIS = [
  "🦊",
  "🐼",
  "🦁",
  "🐯",
  "🐨",
  "🐮",
  "🐷",
  "🐸",
  "🐙",
  "🦒",
  "🦘",
  "🦔",
  "🦦",
  "🦥",
  "🦡",
];

function getAnimalEmoji(id: string): string {
  const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ANIMAL_EMOJIS[Math.abs(hash) % ANIMAL_EMOJIS.length];
}

export default function Dashboard() {
  const { user, logout } = useFirebaseAuth();
  const [, navigate] = useLocation();
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createBlueprintOpen, setCreateBlueprintOpen] = useState(false);
  const [addToProjectOpen, setAddToProjectOpen] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showArchivedBlueprints, setShowArchivedBlueprints] = useState(false);
  const { toast } = useToast();

  const { data: projects = [], isLoading: projectLoading } = useQuery<
    Project[]
  >({
    queryKey: ["/api/projects"],
    staleTime: 30000,
    gcTime: 1800000,
    initialData: [],
    onError: (error: Error) => {
      toast({
        title: "Error loading projects",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: boards = [], isLoading: boardsLoading } = useQuery<Board[]>({
    queryKey: ["/api/boards"],
    staleTime: 30000,
    gcTime: 1800000,
    initialData: [],
    onError: (error: Error) => {
      toast({
        title: "Error loading boards",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!projectToDelete) {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
    }
  }, [projectToDelete]);

  const filteredBoards = boards.filter((board) => {
    if (showArchivedBlueprints) {
      const project = projects.find((p) => p.id === board.projectId);
      return project?.status === "archived";
    }
    return !board.projectId;
  });

  const recentBoards = boards
    .filter((board) => !showArchivedBlueprints || board.status !== "archived")
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt);
      const dateB = new Date(b.updatedAt || b.createdAt);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 3);

  const unassignedBoards = filteredBoards.filter((board) => !board.projectId);

  const filteredProjects = projects.filter((project) =>
    showArchived
      ? project.status === "archived"
      : project.status !== "archived",
  );

  const updateProjectStatus = useMutation({
    mutationFn: async ({
      projectId,
      status,
      color,
    }: {
      projectId: number;
      status: string;
      color?: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/projects/${projectId}`, {
        status,
        color,
      });
      if (!res.ok) throw new Error("Failed to update project status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project status updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateBoardStatus = useMutation({
    mutationFn: async ({
      boardId,
      status,
    }: {
      boardId: number;
      status: string;
    }) => {
      const res = await apiRequest("PATCH", `/api/boards/${boardId}`, {
        status,
      });
      if (!res.ok) throw new Error("Failed to update blueprint status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      toast({
        title: "Success",
        description: "Blueprint status updated. Look at you!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (projectLoading || boardsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 animate-fade-in">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
          <p className="text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8] animate-fade-in">
      <header className="border-b bg-white shadow-sm">
        <div className="max-w-[1440px] mx-auto flex h-24 items-center px-6">
          <div className="flex-1 flex items-center gap-6">
            <Link href="/" className="flex items-center">
              <img src="/Blupi-logomark-blue.png" alt="Blupi" className="h-7" />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative flex items-center gap-2 h-8"
                >
                  <ProfileIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild className="text-sm py-1.5">
                  <Link href="/profile">
                    <User className="mr-2 h-3.5 w-3.5" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-sm py-1.5"
                >
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">
        <div className="bg-white rounded-lg p-10 shadow-md border border-gray-100">
          <h1 className="text-2xl font-bold mb-1.5">Welcome back!</h1>
          <p className="text-sm text-muted-foreground">
            Manage your blueprints and projects
          </p>
        </div>

        <section className="bg-white rounded-lg p-10 shadow-md border border-gray-100">
          {/* Project section header */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Projects</h2>
            </div>
            <Button
              variant="primary-cta"
              size="sm"
              onClick={() => setCreateProjectOpen(true)}
              className="h-9 px-4 py-2 shadow-sm hover:shadow-md transition-shadow text-sm"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create New Project
            </Button>
          </div>
          {projectLoading ? (
            <LoadingSkeleton count={3} />
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                {filteredProjects.map((project) => (
                  <Card
                    key={project.id}
                    className="relative overflow-hidden group hover:shadow-md transition-shadow flex flex-col border border-gray-100"
                  >
                    <div
                      className="absolute inset-y-0 left-0 w-1"
                      style={{
                        backgroundColor: project.color || "#4F46E5",
                        opacity: 1,
                        zIndex: 10,
                      }}
                    />
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">
                            {project.name}
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              updateProjectStatus.mutate({
                                projectId: project.id,
                                status: "archived",
                              })
                            }
                            className="text-muted-foreground hover:text-red-600 p-1 h-auto"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        </div>
                        <StatusSelector
                          type="project"
                          value={project.status}
                          onChange={(status) =>
                            updateProjectStatus.mutate({
                              projectId: project.id,
                              status,
                            })
                          }
                          disabled={updateProjectStatus.isPending}
                        />
                      </div>
                      <div className="mt-2">
                        <div className="text-sm text-muted-foreground">
                          {project.description}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Created on{" "}
                          {format(new Date(project.createdAt), "MMM d, yyyy")}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="mt-auto">
                      <Button
                        variant="ghost"
                        asChild
                        className="border border-gray-100 hover:bg-gray-100"
                      >
                        <Link href={`/project/${project.id}`}>
                          View Project
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}

                {filteredProjects.length === 0 && (
                  <Card className="border-dashed border border-gray-100">
                    <CardHeader>
                      <CardTitle>
                        {showArchived
                          ? "No archived projects"
                          : "Get started with a project"}
                      </CardTitle>
                      <CardDescription>
                        {showArchived
                          ? "When you archive projects, they'll appear here"
                          : "Create a project to organize your blueprints"}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                )}
              </div>

              <div className="flex justify-end mt-8 border-t pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowArchived(!showArchived)}
                  className="flex items-center gap-2"
                >
                  <Archive className="h-4 w-4" />
                  {showArchived
                    ? "Hide Archived Projects"
                    : "Show Archived Projects"}
                </Button>
              </div>
            </>
          )}
        </section>

        <section className="bg-white rounded-lg p-10 shadow-md border border-gray-100">
          {/* Blueprint section header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">Recent Blueprints</h2>
            </div>
            <Button
              variant="primary-cta"
              size="sm"
              onClick={() => setCreateBlueprintOpen(true)}
              className="h-9 px-4 py-2 shadow-sm hover:shadow-md transition-shadow text-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Blueprint
            </Button>
          </div>
          {boardsLoading ? (
            <LoadingSkeleton count={3} />
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                {recentBoards.map((board) => {
                  const project = projects.find(
                    (p) => p.id === board.projectId,
                  );
                  return (
                    <Card
                      key={board.id}
                      className="relative overflow-hidden border border-gray-100 hover:shadow-md transition-shadow flex flex-col"
                    >
                      {project && (
                        <div
                          className="absolute inset-y-0 left-0 w-1"
                          style={{
                            backgroundColor: project.color || "#4F46E5",
                            opacity: 1,
                            zIndex: 10,
                          }}
                        />
                      )}
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">
                            {board.name}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                updateBoardStatus.mutate({
                                  boardId: board.id,
                                  status: "archived",
                                })
                              }
                              className="text-muted-foreground hover:text-red-600 p-1 h-auto"
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                            <StatusSelector
                              type="board"
                              value={board.status}
                              onChange={(status) =>
                                updateBoardStatus.mutate({
                                  boardId: board.id,
                                  status,
                                })
                              }
                              disabled={updateBoardStatus.isPending}
                            />
                          </div>
                        </div>
                        <CardDescription>
                          {board.description}
                          {project && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Project: {project.name}
                            </div>
                          )}
                          <div className="mt-1 text-xs text-muted-foreground">
                            Created on{" "}
                            {format(new Date(board.createdAt), "MMM d, yyyy")}
                          </div>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="mt-auto">
                        <Button
                          variant="ghost"
                          asChild
                          className="border border-gray-100 hover:bg-gray-100"
                        >
                          <Link href={`/board/${board.id}`}>
                            View Blueprint
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex justify-end mt-8 border-t pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setShowArchivedBlueprints(!showArchivedBlueprints)
                  }
                  className="flex items-center gap-2"
                >
                  <Archive className="h-4 w-4" />
                  {showArchivedBlueprints
                    ? "Hide Archived Blueprints"
                    : "Show Archived Blueprints"}
                </Button>
              </div>
            </>
          )}
        </section>

        <section className="bg-white rounded-lg p-10 shadow-md border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">Unassigned Blueprints</h2>
            </div>
            <Button
              variant="primary-cta"
              size="sm"
              onClick={() => setCreateBlueprintOpen(true)}
              className="h-9 px-4 py-2 shadow-sm hover:shadow-md transition-shadow text-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Blueprint
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {unassignedBoards.map((board) => {
              const assignedProject = projects.find(
                (p) => p.id === board.projectId,
              );

              return (
                <Card
                  key={board.id}
                  className="hover:shadow-md transition-shadow flex flex-col border border-gray-100"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{board.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateBoardStatus.mutate({
                              boardId: board.id,
                              status: "archived",
                            })
                          }
                          className="text-muted-foreground hover:text-red-600 p-1 h-auto"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                        <StatusSelector
                          type="board"
                          value={board.status}
                          onChange={(status) =>
                            updateBoardStatus.mutate({
                              boardId: board.id,
                              status,
                            })
                          }
                          disabled={updateBoardStatus.isPending}
                        />
                      </div>
                    </div>
                    <CardDescription>
                      {board.description}
                      <div className="mt-1 text-xs text-muted-foreground">
                        Created on{" "}
                        {format(new Date(board.createdAt), "MMM d, yyyy")}
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="ghost"
                        asChild
                        className="border border-gray-100 hover:bg-gray-100"
                      >
                        <Link href={`/board/${board.id}`}>View Blueprint</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className=" text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setSelectedBoardId(String(board.id));
                          setAddToProjectOpen(true);
                        }}
                      >
                        <Briefcase className="w-4 h-4 mr-2" />
                        {assignedProject
                          ? `Assigned to ${assignedProject.name}`
                          : "Add to Project"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {unassignedBoards.length === 0 && !boardsLoading && (
              <Card className="border-dashed border border-gray-100">
                <CardHeader>
                  <CardTitle>Create your first blueprint</CardTitle>
                  <CardDescription>
                    Start designing your workflow
                  </CardDescription>
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
          projectName={project.name}
        />
      )}
    </div>
  );
}