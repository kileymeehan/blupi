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
  X,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
          <Card key={i} className="relative overflow-hidden border border-gray-200 hover:shadow-lg transition-all duration-200">
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
  const [showWelcome, setShowWelcome] = useState(true);
  const { toast } = useToast();

  const { data: projects = [], isLoading: projectLoading } = useQuery<
    Project[]
  >({
    queryKey: ["/api/projects"],
    staleTime: 30000,
    gcTime: 1800000,
    initialData: [],
  });

  const { data: boards = [], isLoading: boardsLoading } = useQuery<Board[]>({
    queryKey: ["/api/boards"],
    staleTime: 30000,
    gcTime: 1800000,
    initialData: [],
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
      <header className="border-b bg-[#302E87] shadow-sm">
        <div className="max-w-[1440px] mx-auto flex h-24 items-center px-6">
          <div className="flex-1 flex items-center gap-6">
            <Link href="/" className="flex items-center">
              <img src="/Blupi-logomark-blue.png" alt="Blupi" className="h-7 bg-white p-1 rounded" />
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {/* Create New Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="bg-[#F2918C] text-[#302E87] hover:bg-[#f07a73] font-bold h-9 border border-white shadow-sm"
                >
                  Create New
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem 
                  onClick={() => setCreateProjectOpen(true)}
                  className="cursor-pointer text-sm py-3 hover:bg-[#ffe8d6]/50"
                >
                  <Folder className="mr-2 h-4 w-4 text-[#302E87]" />
                  New Project
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setCreateBlueprintOpen(true)}
                  className="cursor-pointer text-sm py-3 hover:bg-[#ffe8d6]/50"
                >
                  <LayoutGrid className="mr-2 h-4 w-4 text-[#302E87]" />
                  New Blueprint
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Divider */}
            <div className="h-8 w-px bg-white/30"></div>
            
            {/* Profile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative flex items-center gap-2 h-8 text-white hover:bg-[#302E87]/20"
                >
                  <div className="border-2 border-white rounded-full">
                    <ProfileIcon />
                  </div>
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
        {showWelcome && (
          <div className="bg-white rounded-lg p-10 shadow-lg border border-gray-300 relative">
            <div className="absolute top-4 right-4">
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => setShowWelcome(false)}
                className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
              >
                <span className="sr-only">Close</span>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative w-full max-w-[200px]">
                {/* Abstract illustration with complementary colors */}
                <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="100" cy="100" r="80" fill="#FFE8D6" opacity="0.7" />
                  <circle cx="70" cy="70" r="40" fill="#F2918C" opacity="0.8" />
                  <circle cx="130" cy="130" r="40" fill="#A1D9F5" opacity="0.8" />
                  <path d="M30,120 C60,180 140,180 170,120" stroke="#302E87" strokeWidth="8" fill="none" />
                  <path d="M50,50 C90,20 110,20 150,50" stroke="#302E87" strokeWidth="6" fill="none" />
                </svg>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-1.5">Welcome Back!</h1>
                <p className="text-sm text-muted-foreground mb-4">
                  Continue working on your blueprints and projects.
                </p>
                <div className="flex gap-4">
                  <Button 
                    onClick={() => setCreateProjectOpen(true)}
                    className="bg-[#302E87] hover:bg-[#252270] text-white"
                  >
                    Create New Project
                  </Button>
                  <Button 
                    onClick={() => setCreateBlueprintOpen(true)}
                    variant="outline"
                    className="border-[#302E87] text-[#302E87] hover:bg-[#FFE8D6]/20"
                  >
                    Create New Blueprint
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <section className="bg-white rounded-lg p-10 shadow-lg border border-gray-300">
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
              className="h-9 px-4 py-2 shadow-sm hover:shadow-md transition-shadow text-sm font-bold border border-white"
            >
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
                    className="relative overflow-hidden group hover:shadow-lg transition-all duration-200 flex flex-col border border-gray-300"
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
                        <div className="mt-2 flex items-center gap-2">
                          {project.user && (
                            <div className="relative group">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-primary text-white text-xs">
                                  {project.user.username.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -translate-y-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                <div className="bg-popover shadow-md rounded px-2 py-1 text-xs text-popover-foreground whitespace-nowrap">
                                  <div>{project.user.username}</div>
                                  <div className="text-muted-foreground">{project.user.email}</div>
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            Created on{" "}
                            {format(new Date(project.createdAt), "MMM d, yyyy")}
                          </div>
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
                  <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
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

        <section className="bg-white rounded-lg p-10 shadow-lg border border-gray-300">
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
                      className="relative overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col border border-gray-300"
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
                          <div className="mt-2 flex items-center gap-2">
                            {board.user && (
                              <div className="relative group">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="bg-primary text-white text-xs">
                                    {board.user.username.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -translate-y-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                  <div className="bg-popover shadow-md rounded px-2 py-1 text-xs text-popover-foreground whitespace-nowrap">
                                    <div>{board.user.username}</div>
                                    <div className="text-muted-foreground">{board.user.email}</div>
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              Created on{" "}
                              {format(new Date(board.createdAt), "MMM d, yyyy")}
                            </div>
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

        <section className="bg-white rounded-lg p-10 shadow-lg border border-gray-300">
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
                  className="hover:shadow-lg transition-all duration-200 flex flex-col border border-gray-300"
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
                      <div className="mt-2 flex items-center gap-2">
                        {board.user && (
                          <div className="relative group">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="bg-primary text-white text-xs">
                                {board.user.username.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -translate-y-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                              <div className="bg-popover shadow-md rounded px-2 py-1 text-xs text-popover-foreground whitespace-nowrap">
                                <div>{board.user.username}</div>
                                <div className="text-muted-foreground">{board.user.email}</div>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Created on{" "}
                          {format(new Date(board.createdAt), "MMM d, yyyy")}
                        </div>
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
              <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
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
        projectId={undefined}
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