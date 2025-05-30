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
  Upload,
  Calendar,
  FolderSymlink,
  Clock,
  ChevronDown,
  FileBarChart,
  Eye,
  EyeOff,
  Trash,
  FileText,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { PendoImportDialog } from "@/components/csv-import/pendo-import-dialog";

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
  const { user, logout, devBypassEnabled, enableDevBypass, disableDevBypass } = useFirebaseAuth();
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
  const [importDialogOpen, setImportDialogOpen] = useState(false);
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

  // State for sorted boards
  const [sortedBoards, setSortedBoards] = useState<Board[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: 'name' | 'date' | 'status' | 'project',
    direction: 'ascending' | 'descending'
  }>({ key: 'date', direction: 'descending' });
  
  // Filter and sort boards when relevant states change
  useEffect(() => {
    // First filter based on archived status
    const filtered = boards.filter((board) => {
      return showArchivedBlueprints 
        ? board.status === "archived" 
        : board.status !== "archived";
    });
    
    // Then sort based on current sort configuration
    const sorted = [...filtered].sort((a, b) => {
      switch (sortConfig.key) {
        case 'name':
          return sortConfig.direction === 'ascending' 
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
          
        case 'date':
          const dateA = new Date(a.updatedAt || a.createdAt).getTime();
          const dateB = new Date(b.updatedAt || b.createdAt).getTime();
          return sortConfig.direction === 'ascending'
            ? dateA - dateB
            : dateB - dateA;
          
        case 'status':
          return sortConfig.direction === 'ascending'
            ? a.status.localeCompare(b.status)
            : b.status.localeCompare(a.status);
          
        case 'project':
          const projectA = projects.find(p => p.id === a.projectId)?.name || '';
          const projectB = projects.find(p => p.id === b.projectId)?.name || '';
          return sortConfig.direction === 'ascending'
            ? projectA.localeCompare(projectB)
            : projectB.localeCompare(projectA);
            
        default:
          return 0;
      }
    });
    
    setSortedBoards(sorted);
  }, [boards, showArchivedBlueprints, sortConfig, projects]);
  
  // Function to request sorting
  const requestSort = (key: 'name' | 'date' | 'status' | 'project') => {
    setSortConfig(prevConfig => ({
      key,
      direction: 
        prevConfig.key === key && prevConfig.direction === 'ascending'
          ? 'descending'
          : 'ascending'
    }));
  };
  
  // State to track whether to show all blueprints or just the first 10
  const [showAllBlueprints, setShowAllBlueprints] = useState(false);
  
  // For convenience in the UI
  const recentBoards = sortedBoards;
  // Limit blueprints to 10 unless showAllBlueprints is true
  const displayedBoards = showAllBlueprints ? recentBoards : recentBoards.slice(0, 10);

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
                  className="bg-[#F2918C] text-[#302E87] hover:bg-[#f07a73] font-bold h-9 border border-white shadow-sm flex items-center gap-1"
                >
                  Create New
                  <ChevronDown size={14} />
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
                  <FileText className="mr-2 h-4 w-4 text-[#302E87]" />
                  New Blueprint
                </DropdownMenuItem>
                
                {/* Import options */}
                <DropdownMenuItem 
                  onClick={() => setImportDialogOpen(true)}
                  className="cursor-pointer text-sm py-3 hover:bg-[#ffe8d6]/50"
                >
                  <FileBarChart className="mr-2 h-4 w-4 text-[#302E87]" />
                  Import from Pendo
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setImportDialogOpen(true)}
                  className="cursor-pointer text-sm py-3 hover:bg-[#ffe8d6]/50"
                >
                  <Upload className="mr-2 h-4 w-4 text-[#302E87]" />
                  Import from CSV
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
                
                {/* Development Mode Toggle */}
                <DropdownMenuItem
                  onClick={() => {
                    if (devBypassEnabled) {
                      disableDevBypass();
                      toast({
                        title: "Development Mode Disabled",
                        description: "Firebase authentication is now required.",
                      });
                    } else {
                      enableDevBypass();
                      toast({
                        title: "Development Mode Enabled",
                        description: "You are now bypassing Firebase authentication.",
                      });
                    }
                  }}
                  className={`cursor-pointer text-sm py-1.5 ${devBypassEnabled ? 'bg-amber-100 text-amber-700' : ''}`}
                >
                  <div className="w-3.5 h-3.5 mr-2 flex items-center justify-center">
                    {devBypassEnabled ? "🔓" : "🔐"}
                  </div>
                  {devBypassEnabled ? "Disable Dev Mode" : "Enable Dev Mode"}
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
                <p className="text-gray-600 mb-4 max-w-2xl">
                  Continue managing your product design lifecycle with Blupi. Create new
                  blueprints, organize them into projects, and collaborate with your team.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#302E87] text-[#302E87]"
                    onClick={() => setCreateBlueprintOpen(true)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Create New Blueprint
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#302E87] text-[#302E87]"
                    onClick={() => setImportDialogOpen(true)}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Import from CSV
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BLUEPRINTS SECTION FIRST */}
        <section className="bg-white rounded-lg p-10 shadow-lg border border-gray-300">
          {/* Blueprint section header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">Blueprints</h2>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllBlueprints(!showAllBlueprints)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#302E87]"
              >
                {showAllBlueprints ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Show Less
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Show All ({recentBoards.length})
                  </>
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="primary-cta"
                    className="h-9 shadow-sm hover:shadow-md transition-shadow text-sm font-bold border border-white flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Create Blueprint
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem 
                    onClick={() => setCreateBlueprintOpen(true)}
                    className="cursor-pointer text-sm py-3 hover:bg-[#ffe8d6]/50"
                  >
                    <FileText className="mr-2 h-4 w-4 text-[#302E87]" />
                    New Empty Blueprint
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setImportDialogOpen(true)}
                    className="cursor-pointer text-sm py-3 hover:bg-[#ffe8d6]/50"
                  >
                    <FileBarChart className="mr-2 h-4 w-4 text-[#302E87]" />
                    Import from Pendo
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setImportDialogOpen(true)}
                    className="cursor-pointer text-sm py-3 hover:bg-[#ffe8d6]/50"
                  >
                    <Upload className="mr-2 h-4 w-4 text-[#302E87]" />
                    Import from CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {boardsLoading ? (
            <div className="animate-pulse p-4 rounded-md bg-gray-100">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-md border mb-8">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead 
                        className="w-[250px] cursor-pointer hover:text-primary"
                        onClick={() => requestSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Blueprint Name</span>
                          <ChevronDown size={14} />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="w-[150px] cursor-pointer hover:text-primary"
                        onClick={() => requestSort('date')}
                      >
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span>Created</span>
                          <ChevronDown size={14} />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="w-[100px] cursor-pointer hover:text-primary"
                        onClick={() => requestSort('status')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Status</span>
                          <ChevronDown size={14} />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="w-[200px] cursor-pointer hover:text-primary"
                        onClick={() => requestSort('project')}
                      >
                        <div className="flex items-center gap-1">
                          <FolderSymlink size={14} />
                          <span>Assigned Project</span>
                          <ChevronDown size={14} />
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedBoards.map((board) => {
                      const project = projects.find((p) => p.id === board.projectId);
                      return (
                        <TableRow key={board.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            <Link href={`/board/${board.id}`} className="text-[#302E87] hover:underline">
                              {board.name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-gray-600">
                              <Clock size={14} />
                              <span>{format(new Date(board.createdAt), "MMM d, yyyy")}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                board.status === "draft" ? "outline" : 
                                board.status === "in-progress" ? "secondary" : 
                                board.status === "review" ? "default" : 
                                board.status === "complete" ? "default" : 
                                "destructive"
                              }
                              className={`capitalize ${board.status === "complete" ? "bg-green-500 hover:bg-green-600" : ""}`}
                            >
                              {board.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {board.projectId ? (
                              <div className="flex items-center">
                                <div 
                                  className="w-3 h-3 rounded-full mr-2" 
                                  style={{ backgroundColor: project?.color || "#4F46E5" }}
                                ></div>
                                <span>{project?.name}</span>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-sm text-gray-500 hover:text-[#302E87]"
                                onClick={() => {
                                  setSelectedBoardId(String(board.id));
                                  setAddToProjectOpen(true);
                                }}
                              >
                                <FolderSymlink size={14} className="mr-1" />
                                Assign to project
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                              onClick={() =>
                                updateBoardStatus.mutate({
                                  boardId: board.id,
                                  status: "archived",
                                })
                              }
                            >
                              <Archive size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                              onClick={() => {
                                if (confirm("Are you sure you want to permanently delete this blueprint? This action cannot be undone.")) {
                                  fetch(`/api/boards/${board.id}`, { method: 'DELETE' })
                                    .then(res => {
                                      if (res.ok) {
                                        toast({
                                          title: "Success",
                                          description: "Blueprint permanently deleted."
                                        });
                                        queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
                                      } else {
                                        toast({
                                          title: "Error",
                                          description: "Failed to delete blueprint.",
                                          variant: "destructive"
                                        });
                                      }
                                    });
                                }
                              }}
                            >
                              <Trash size={16} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {recentBoards.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                          No blueprints found. Create your first blueprint to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
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

        {/* PROJECTS SECTION SECOND */}
        <section className="bg-white rounded-lg p-10 shadow-lg border border-gray-300">
          {/* Project section header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Folder className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">Projects</h2>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="primary-cta"
                  className="h-9 shadow-sm hover:shadow-md transition-shadow text-sm font-bold border border-white flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Create Project
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem 
                  onClick={() => setCreateProjectOpen(true)}
                  className="cursor-pointer text-sm py-3 hover:bg-[#ffe8d6]/50"
                >
                  <Folder className="mr-2 h-4 w-4 text-[#302E87]" />
                  New Empty Project
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setImportDialogOpen(true)}
                  className="cursor-pointer text-sm py-3 hover:bg-[#ffe8d6]/50"
                >
                  <FileBarChart className="mr-2 h-4 w-4 text-[#302E87]" />
                  Import from Pendo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {projectLoading ? (
            <LoadingSkeleton />
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project) => (
                  <Card
                    key={project.id}
                    className="relative overflow-hidden border border-gray-200 hover:shadow-lg transition-all duration-200"
                  >
                    <div
                      className="absolute h-1 w-full top-0 left-0"
                      style={{ backgroundColor: project.color || "#4F46E5" }}
                    ></div>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: project.color || "#4F46E5",
                            }}
                          ></div>
                          <CardTitle className="text-lg">{project.name}</CardTitle>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0"
                            >
                              <ChevronDown className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setProjectToDelete({
                                  id: project.id,
                                  name: project.name,
                                });
                              }}
                              className="text-red-600"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                            {project.status !== "archived" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  updateProjectStatus.mutate({
                                    projectId: project.id,
                                    status: "archived",
                                  })
                                }
                              >
                                <Archive className="mr-2 h-4 w-4" />
                                <span>Archive</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardDescription className="mt-1.5">
                        {project.description || "No description provided."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-between items-center">
                      <StatusSelector
                        type="project"
                        value={project.status}
                        onChange={(status) =>
                          updateProjectStatus.mutate({
                            projectId: project.id,
                            status,
                          })
                        }
                      />
                      <div className="flex items-center space-x-3">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/project/${project.id}`}>
                            View
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredProjects.length === 0 && (
                  <div className="col-span-full">
                    <div className="text-center py-12 bg-gray-50 rounded-md border border-gray-200">
                      <Briefcase className="text-gray-400 h-12 w-12 mx-auto mb-4" />
                      <h3 className="font-medium text-lg mb-1">No projects found</h3>
                      <p className="text-gray-500 mb-4">
                        {showArchived
                          ? "You don't have any archived projects."
                          : "Create your first project to get started."}
                      </p>
                      {!showArchived && (
                        <Button
                          onClick={() => setCreateProjectOpen(true)}
                          className="mt-2 bg-primary"
                        >
                          <Plus className="h-4 w-4 mr-1.5" />
                          Create New Project
                        </Button>
                      )}
                    </div>
                  </div>
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
      
      {/* Pendo CSV Import Dialog */}
      <PendoImportDialog
        isOpen={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
    </div>
  );
}