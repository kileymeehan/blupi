import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus,
  LogOut,
  User,
  Users,
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
  MoreVertical,
  Copy,
  Check,
  UserPlus,
  Share2,
  Star,
  ExternalLink,
  Settings,
  Building2,
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
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-simple-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { BoardImportDialog } from "@/components/google-sheets/board-import-dialog";
import { ComingSoonBadge } from "@/components/ui/coming-soon-badge";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ShareFriendDialog } from "@/components/share-friend-dialog";
import { useIntroTour } from "@/hooks/use-intro-tour";
import { BubbleLoading } from "@/components/ui/bubble-loading";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProfileModal } from "@/components/profile-modal";
import { SearchFilter } from "@/components/search-filter";
import { OrganizationSwitcher } from "@/components/organization-switcher";


// Loading skeleton component for projects/boards
function LoadingSkeleton({ count = 3 }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array(count)
        .fill(null)
        .map((_, i) => (
          <Card key={i} className="relative overflow-hidden border border-gray-200 hover:shadow transition-all duration-200">
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
  const { user, signOut } = useAuth();
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
  const [shareWithFriendOpen, setShareWithFriendOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const [googleSheetsImportOpen, setGoogleSheetsImportOpen] = useState(false);
  const [selectedProjectForImport, setSelectedProjectForImport] = useState<Project | null>(null);
  const [selectedBlueprints, setSelectedBlueprints] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'projects' | 'blueprints' | 'starred'>('projects');
  
  // Enhanced search and filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  
  const { toast } = useToast();

  // Dashboard tour configuration
  const dashboardTourSteps = [
    {
      element: '#sidebar',
      intro: '<strong>Welcome to Blupi!</strong> This navigation helps you switch between projects, blueprints, and team management.',
      position: 'bottom' as const
    },
    {
      element: '.projects-grid',
      intro: '<strong>Your Project Hub</strong> Your projects are organized here. Each project can contain multiple blueprints and team members.',
      position: 'top' as const
    },
    {
      element: '.notification-bell',
      intro: '<strong>Stay Connected</strong> Get notified about comments, mentions, and team activities in real-time.',
      position: 'bottom' as const
    },
    {
      element: '.welcome-content',
      intro: '<strong>Create & Import</strong> Use these buttons to create your first blueprint or import existing workflows from CSV files.',
      position: 'top' as const
    }
  ];



  useIntroTour({
    steps: dashboardTourSteps,
    tourKey: 'dashboard-welcome',
    enabled: true,
    onComplete: () => {
      toast({
        title: "Welcome to Blupi!",
        description: "You're all set to start creating amazing customer journey blueprints.",
      });
    }
  });

  const { data: projects = [], isLoading: projectLoading } = useQuery<
    Project[]
  >({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      console.log('[Dashboard] Fetching projects...');
      const response = await fetch("/api/projects");
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Too many requests. Please wait a moment before trying again.");
        }
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      console.log('[Dashboard] Projects received:', data.length, 'projects:', data);
      return data;
    },
    staleTime: 30000,
    gcTime: 1800000,
    initialData: [],
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("Too many requests")) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const { data: boards = [], isLoading: boardsLoading } = useQuery<Board[]>({
    queryKey: ["/api/boards"],
    queryFn: async () => {
      console.log('[Dashboard] Fetching boards...');
      const response = await fetch("/api/boards");
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Too many requests. Please wait a moment before trying again.");
        }
        throw new Error('Failed to fetch boards');
      }
      const data = await response.json();
      console.log('[Dashboard] Boards received:', data.length, 'boards:', data);
      return data;
    },
    enabled: !!user,
    staleTime: 30000,
    gcTime: 1800000,
    initialData: [],
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("Too many requests")) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Query for starred (flagged) blocks
  const { data: starredItems = [], isLoading: starredLoading } = useQuery({
    queryKey: ["/api/flagged-blocks"],
    queryFn: async () => {
      const response = await fetch("/api/flagged-blocks");
      if (!response.ok) {
        throw new Error('Failed to fetch starred items');
      }
      return response.json();
    },
    enabled: !!user,
    staleTime: 30000,
    gcTime: 1800000,
    initialData: [],
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Mutations for starred items
  const resolveStarredItemMutation = useMutation({
    mutationFn: async (flaggedBlockId: number) => {
      const response = await fetch(`/api/flagged-blocks/${flaggedBlockId}/resolve`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        throw new Error('Failed to resolve starred item');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flagged-blocks"] });
    },
  });

  const removeStarredItemMutation = useMutation({
    mutationFn: async (flaggedBlockId: number) => {
      const response = await fetch(`/api/flagged-blocks/${flaggedBlockId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to remove starred item');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flagged-blocks"] });
    },
  });

  useEffect(() => {
    if (!projectToDelete) {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/flagged-blocks"] });
    }
  }, [projectToDelete]);

  // State for sorted boards
  const [sortedBoards, setSortedBoards] = useState<Board[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: 'name' | 'date' | 'status' | 'project',
    direction: 'ascending' | 'descending'
  }>({ key: 'date', direction: 'descending' });

  // Enhanced filtering and sorting logic for boards
  const filteredAndSortedBoards = React.useMemo(() => {
    let filtered = boards.filter((board) => {
      // Archive status filter
      const archiveMatch = showArchivedBlueprints 
        ? board.status === "archived" 
        : board.status !== "archived";
      
      // Search term filter
      const searchMatch = !searchTerm || 
        board.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        board.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const statusMatch = statusFilter === 'all' || board.status === statusFilter;
      
      // Project filter
      const project = projects.find(p => p.id === board.projectId);
      const projectMatch = projectFilter === 'all' || project?.name === projectFilter;
      
      return archiveMatch && searchMatch && statusMatch && projectMatch;
    });

    // Sort the filtered results
    const sorted = [...filtered].sort((a, b) => {
      switch (sortConfig.key) {
        case 'name':
          return sortConfig.direction === 'ascending' 
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        case 'date':
          const aDate = new Date(a.updatedAt || a.createdAt);
          const bDate = new Date(b.updatedAt || b.createdAt);
          return sortConfig.direction === 'ascending' 
            ? aDate.getTime() - bDate.getTime()
            : bDate.getTime() - aDate.getTime();
        case 'status':
          return sortConfig.direction === 'ascending'
            ? a.status.localeCompare(b.status)
            : b.status.localeCompare(a.status);
        case 'project':
          const aProject = projects.find(p => p.id === a.projectId)?.name || '';
          const bProject = projects.find(p => p.id === b.projectId)?.name || '';
          return sortConfig.direction === 'ascending'
            ? aProject.localeCompare(bProject)
            : bProject.localeCompare(aProject);
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [boards, showArchivedBlueprints, searchTerm, statusFilter, projectFilter, projects, sortConfig]);

  // Enhanced filtering for projects
  const filteredAndSortedProjects = React.useMemo(() => {
    let filtered = projects.filter((project) => {
      // Archive status filter
      const archiveMatch = showArchived 
        ? project.status === "archived" 
        : project.status !== "archived";
      
      // Search term filter
      const searchMatch = !searchTerm || 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const statusMatch = statusFilter === 'all' || project.status === statusFilter;
      
      return archiveMatch && searchMatch && statusMatch;
    });

    // Sort projects by the same logic
    const sorted = [...filtered].sort((a, b) => {
      switch (sortConfig.key) {
        case 'name':
          return sortConfig.direction === 'ascending' 
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        case 'date':
          const aDate = new Date(a.updatedAt || a.createdAt);
          const bDate = new Date(b.updatedAt || b.createdAt);
          return sortConfig.direction === 'ascending' 
            ? aDate.getTime() - bDate.getTime()
            : bDate.getTime() - aDate.getTime();
        case 'status':
          return sortConfig.direction === 'ascending'
            ? a.status.localeCompare(b.status)
            : b.status.localeCompare(a.status);
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [projects, showArchived, searchTerm, statusFilter, sortConfig]);

  // State to track whether to show all blueprints or just the first 10
  const [showAllBlueprints, setShowAllBlueprints] = useState(false);
  
  // For convenience in the UI
  const recentBoards = filteredAndSortedBoards;
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

  // Individual blueprint duplicate action
  const duplicateBlueprint = useMutation({
    mutationFn: async (boardId: number) => {
      const board = boards.find(b => b.id === boardId);
      if (!board) throw new Error("Blueprint not found");
      
      const res = await apiRequest("POST", "/api/boards", {
        name: `${board.name} (Copy)`,
        blocks: board.blocks,
        projectId: board.projectId,
        status: "draft"
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      toast({
        title: "Success",
        description: "Blueprint duplicated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to duplicate blueprint.",
        variant: "destructive",
      });
    },
  });

  // Bulk actions for blueprints
  const bulkArchiveBlueprints = useMutation({
    mutationFn: async (blueprintIds: number[]) => {
      const promises = blueprintIds.map(id => 
        apiRequest("PATCH", `/api/boards/${id}`, { status: "archived" })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      const count = selectedBlueprints.size;
      setSelectedBlueprints(new Set());
      toast({
        title: "Success",
        description: `${count} blueprint(s) archived successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive blueprints.",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteBlueprints = useMutation({
    mutationFn: async (blueprintIds: number[]) => {
      const promises = blueprintIds.map(id => 
        fetch(`/api/boards/${id}`, { method: 'DELETE' })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      const count = selectedBlueprints.size;
      setSelectedBlueprints(new Set());
      toast({
        title: "Success",
        description: `${count} blueprint(s) deleted successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete blueprints.",
        variant: "destructive",
      });
    },
  });

  const bulkDuplicateBlueprints = useMutation({
    mutationFn: async (blueprintIds: number[]) => {
      const promises = blueprintIds.map(async (id) => {
        const board = boards.find(b => b.id === id);
        if (!board) return;
        
        const res = await apiRequest("POST", "/api/boards", {
          name: `${board.name} (Copy)`,
          blocks: board.blocks,
          projectId: board.projectId,
          status: "draft"
        });
        return res.json();
      });
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      const count = selectedBlueprints.size;
      setSelectedBlueprints(new Set());
      toast({
        title: "Success",
        description: `${count} blueprint(s) duplicated successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to duplicate blueprints.",
        variant: "destructive",
      });
    },
  });

  // Checkbox handlers
  const handleSelectBlueprint = (boardId: number, checked: boolean) => {
    const newSelected = new Set(selectedBlueprints);
    if (checked) {
      newSelected.add(boardId);
    } else {
      newSelected.delete(boardId);
    }
    setSelectedBlueprints(newSelected);
  };

  const handleSelectAllBlueprints = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(displayedBoards.map(board => board.id));
      setSelectedBlueprints(allIds);
    } else {
      setSelectedBlueprints(new Set());
    }
  };

  const handleBulkAction = (action: 'archive' | 'delete' | 'duplicate') => {
    const selectedIds = Array.from(selectedBlueprints);
    if (selectedIds.length === 0) return;

    switch (action) {
      case 'archive':
        bulkArchiveBlueprints.mutate(selectedIds);
        break;
      case 'delete':
        if (confirm(`Are you sure you want to permanently delete ${selectedIds.length} blueprint(s)? This action cannot be undone.`)) {
          bulkDeleteBlueprints.mutate(selectedIds);
        }
        break;
      case 'duplicate':
        bulkDuplicateBlueprints.mutate(selectedIds);
        break;
    }
  };

  if (projectLoading || boardsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <BubbleLoading 
          size="lg" 
          message="Loading your workspace..." 
          className="py-20"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] animate-fade-in">
      <header className="border-b-4 border-[#E53935] bg-[#0A0A0F] shadow-lg">
        <div className="max-w-[1440px] mx-auto flex h-20 items-center px-6">
          <div className="flex-1 flex items-center gap-4">
            <Link href="/" className="flex items-center">
              <img src="/blupi-logomark-white.png" alt="Blupi" className="h-10" />
            </Link>
            <OrganizationSwitcher />
          </div>

          <div className="flex items-center gap-3">
            {/* Settings Icon */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:text-[#FFD600] hover:bg-white/10 h-10 w-10 transition-colors"
              onClick={() => window.location.href = '/settings'}
              data-testid="header-settings-button"
            >
              <Settings className="h-6 w-6" />
            </Button>
            
            {/* Notification Bell */}
            <div className="notification-bell">
              <NotificationBell variant="dark" />
            </div>
            
            {/* Divider */}
            <div className="h-8 w-px bg-[#E53935] mx-1"></div>
            
            {/* Profile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative flex items-center gap-2 h-10 w-10 p-0 text-white hover:bg-white/10"
                >
                  <div className="border-2 border-[#FFD600] rounded-full">
                    <ProfileIcon />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem 
                  onClick={() => setProfileModalOpen(true)}
                  className="cursor-pointer text-sm py-1.5"
                >
                  <User className="mr-2 h-3.5 w-3.5" />
                  Profile Settings
                </DropdownMenuItem>
                
                <DropdownMenuItem
                  onClick={() => setShareWithFriendOpen(true)}
                  className="cursor-pointer text-sm py-1.5"
                  id="share-btn"
                >
                  <UserPlus className="mr-2 h-3.5 w-3.5" />
                  Share Blupi with a Friend
                </DropdownMenuItem>

                
                <DropdownMenuItem
                  onClick={signOut}
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
          <div className="bg-white border-4 border-[#0A0A0F] p-10 shadow-xl relative welcome-content">
            <div className="absolute top-4 right-4">
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => setShowWelcome(false)}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <span className="sr-only">Close</span>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative w-full max-w-[200px]">
                <div className="absolute inset-0 bg-[#FFD600] -rotate-6 opacity-30" />
                <img 
                  src="/blupi-pufferfish.png" 
                  alt="Blupi mascot" 
                  className="w-full h-auto relative z-10"
                />
              </div>
              <div className="flex-1">
                <div className="inline-block bg-[#E53935] text-white px-4 py-1 font-bold uppercase tracking-widest text-xs mb-4">
                  Dashboard
                </div>
                <h1 className="text-5xl mb-3 font-black text-[#0A0A0F] uppercase tracking-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Blueprinting Reimagined
                </h1>
                <p className="text-gray-600 mb-6 max-w-2xl text-lg leading-relaxed">
                  Design customer journeys with visual blueprints, invite your team to collaborate in real-time, 
                  and import workflows from PDFs with AI assistance.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    size="sm"
                    className="bg-[#E53935] text-white hover:bg-[#C62828] font-bold uppercase tracking-wider border-2 border-[#E53935]"
                    onClick={() => setCreateBlueprintOpen(true)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Create Blueprint
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-2 border-[#0A0A0F] text-[#0A0A0F] font-bold uppercase tracking-wider hover:bg-[#0A0A0F] hover:text-white"
                    onClick={() => setImportDialogOpen(true)}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b-4 border-[#0A0A0F]" id="sidebar">
          <nav className="-mb-px flex space-x-0">
            <button
              onClick={() => setActiveTab('projects')}
              className={`whitespace-nowrap py-3 px-6 font-bold text-sm uppercase tracking-wider transition-all ${
                activeTab === 'projects'
                  ? 'bg-[#0A0A0F] text-white'
                  : 'bg-transparent text-[#0A0A0F] hover:bg-[#FFD600]'
              }`}
            >
              <Folder className="w-4 h-4 inline mr-2" />
              Projects
            </button>
            <button
              onClick={() => setActiveTab('blueprints')}
              className={`whitespace-nowrap py-3 px-6 font-bold text-sm uppercase tracking-wider transition-all ${
                activeTab === 'blueprints'
                  ? 'bg-[#0A0A0F] text-white'
                  : 'bg-transparent text-[#0A0A0F] hover:bg-[#FFD600]'
              }`}
            >
              <LayoutGrid className="w-4 h-4 inline mr-2" />
              Blueprints
            </button>
            <button
              onClick={() => setActiveTab('starred')}
              className={`whitespace-nowrap py-3 px-6 font-bold text-sm uppercase tracking-wider transition-all ${
                activeTab === 'starred'
                  ? 'bg-[#0A0A0F] text-white'
                  : 'bg-transparent text-[#0A0A0F] hover:bg-[#FFD600]'
              }`}
            >
              <Star className="w-4 h-4 inline mr-2" />
              Starred
            </button>
          </nav>
        </div>

        {/* Starred Items Tab */}
        {activeTab === 'starred' && (
          <section className="bauhaus-card p-10">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Star className="h-6 w-6 text-[#FFD600]" />
                <h2 className="text-2xl font-black uppercase tracking-wide text-[#0A0A0F]">Starred Items</h2>
              </div>
              <div className="text-sm text-gray-500">
                {starredItems.length} items starred
              </div>
            </div>

            {starredLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : starredItems.length === 0 ? (
              <div className="text-center py-12">
                <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No starred items yet</h3>
                <p className="text-gray-500">
                  Star blocks in your blueprints to track important design opportunities and friction points
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {starredItems.map((item: any) => {
                  // Find the actual block in the board data to get type and content
                  const board = boards.find(b => b.id === item.boardId);
                  const block = board?.blocks?.find((b: any) => b.id === item.blockId);
                  const project = projects.find(p => p.id === item.board?.projectId);
                  
                  return (
                    <div key={item.id} className="bauhaus-card p-4 mb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Star className="h-4 w-4 text-[#FFD600] fill-current" />
                            <div className="flex items-center gap-2">
                              <Link href={`/board/${item.boardId}`} className="text-[#1976D2] hover:text-[#1565C0] font-black uppercase tracking-tight">
                                {board?.name || 'Blueprint'}
                              </Link>
                              <ExternalLink className="h-3 w-3 text-[#0A0A0F]" />
                            </div>
                            <span className="text-[#0A0A0F] font-bold">•</span>
                            <span className="text-sm text-[#0A0A0F] font-bold uppercase tracking-wider">
                              {project?.name || 'No Project'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs capitalize">
                              {block?.type?.replace('-', ' ') || 'Block'}
                            </Badge>
                            {block?.content && (
                              <span className="text-sm text-gray-600 truncate max-w-md">
                                {block.content.length > 50 ? `${block.content.substring(0, 50)}...` : block.content}
                              </span>
                            )}
                          </div>
                          {item.reason && (
                            <div className="text-sm text-gray-600 mb-1">
                              <span className="font-medium">Note:</span> {item.reason}
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            Starred by {item.user?.username || 'Unknown'} on {new Date(item.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            className="bauhaus-btn h-8 px-4 text-xs"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Done
                          </Button>
                          <Button
                            className="bauhaus-btn h-8 px-4 text-xs"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* BLUEPRINTS SECTION */}
        {activeTab === 'blueprints' && (
          <section className="bauhaus-card p-10">
            {/* Blueprint section header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-[#E53935]" />
                <h2 className="text-2xl font-black uppercase tracking-wide text-[#0A0A0F]">Blueprints</h2>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllBlueprints(!showAllBlueprints)}
                  className="flex items-center gap-2 text-sm text-[#0A0A0F] font-bold uppercase tracking-wider hover:text-[#E53935]"
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
                      className="bauhaus-btn h-10 px-6"
                      id="add-blueprint-btn"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Blueprint
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem 
                      onClick={() => setCreateBlueprintOpen(true)}
                      className="cursor-pointer text-sm py-3 hover:bg-[#FFD600]/30"
                    >
                      <FileText className="mr-2 h-4 w-4 text-[#0A0A0F]" />
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
                    <DropdownMenuItem 
                      onClick={() => {
                        if (projects?.length) {
                          setSelectedProjectForImport(projects[0]);
                          setGoogleSheetsImportOpen(true);
                        } else {
                          toast({
                            title: "No Projects",
                            description: "Please create a project first before importing from Google Sheets",
                            variant: "destructive"
                          });
                        }
                      }}
                      className="cursor-pointer text-sm py-3 hover:bg-[#ffe8d6]/50"
                    >
                      <FileBarChart className="mr-2 h-4 w-4 text-[#302E87]" />
                      Import from Google Sheets
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      disabled
                      className="text-sm py-3 opacity-50 cursor-not-allowed"
                    >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <div className="mr-2 h-4 w-4 text-[#302E87] flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M4 4.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-7z"/>
                            <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2z"/>
                          </svg>
                        </div>
                        Import from Figma
                      </div>
                      <ComingSoonBadge />
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Enhanced Search and Filter Component */}
          <SearchFilter
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            sortConfig={sortConfig}
            onSortChange={setSortConfig}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            projectFilter={projectFilter}
            onProjectFilterChange={setProjectFilter}
            availableProjects={projects.map(p => ({ id: p.id, name: p.name }))}
            totalResults={boards.length}
            filteredResults={filteredAndSortedBoards.length}
          />
          
          {boardsLoading ? (
            <BubbleLoading 
              size="md" 
              message="Loading blueprints..." 
              className="py-12"
            />
          ) : (
            <>
              {/* Bulk actions bar */}
              {selectedBlueprints.size > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedBlueprints.size} blueprint(s) selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkAction('duplicate')}
                      className="bg-white hover:bg-gray-50"
                    >
                      <Copy className="mr-1 h-4 w-4" />
                      Duplicate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkAction('archive')}
                      className="bg-white hover:bg-gray-50"
                    >
                      <Archive className="mr-1 h-4 w-4" />
                      Archive
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkAction('delete')}
                      className="bg-white hover:bg-red-50 text-red-600 border-red-200"
                    >
                      <Trash className="mr-1 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
              <div className="bauhaus-card overflow-hidden mb-8">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-100 border-b border-gray-300">
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedBlueprints.size === displayedBoards.length && displayedBoards.length > 0}
                          onCheckedChange={handleSelectAllBlueprints}
                        />
                      </TableHead>
                      <TableHead className="w-[250px]">
                        <div className="flex items-center gap-1 font-black uppercase tracking-wider text-[#0A0A0F]">
                          <span>Blueprint Name</span>
                        </div>
                      </TableHead>
                      <TableHead className="w-[150px]">
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span>Created</span>
                        </div>
                      </TableHead>
                      <TableHead className="w-[140px]">
                        <div className="flex items-center gap-1">
                          <span>Status</span>
                        </div>
                      </TableHead>
                      <TableHead className="w-[200px]">
                        <div className="flex items-center gap-1">
                          <FolderSymlink size={14} />
                          <span>Assigned Project</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedBoards.map((board) => {
                      const project = projects.find((p) => p.id === board.projectId);
                      return (
                        <TableRow key={board.id} className="hover:bg-[#FFD600]/10">
                          <TableCell>
                            <Checkbox
                              checked={selectedBlueprints.has(board.id)}
                              onCheckedChange={(checked) => handleSelectBlueprint(board.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="font-black uppercase tracking-tight">
                            <Link href={`/board/${board.id}`} className="text-[#1976D2] hover:text-[#1565C0]">
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
                            <StatusBadge status={board.status} />
                          </TableCell>
                          <TableCell>
                            {board.projectId ? (
                              <div className="flex items-center">
                                <div 
                                  className="w-3 h-3 border-2 border-[#0A0A0F] mr-2" 
                                  style={{ backgroundColor: project?.color || "#1976D2" }}
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
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
                                >
                                  <MoreVertical size={16} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem 
                                  onClick={() => duplicateBlueprint.mutate(board.id)}
                                  className="cursor-pointer text-sm py-2 hover:bg-gray-50"
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => updateBoardStatus.mutate({
                                    boardId: board.id,
                                    status: "archived",
                                  })}
                                  className="cursor-pointer text-sm py-2 hover:bg-gray-50"
                                >
                                  <Archive className="mr-2 h-4 w-4" />
                                  Archive
                                </DropdownMenuItem>
                                <DropdownMenuItem 
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
                                  className="cursor-pointer text-sm py-2 hover:bg-red-50 text-red-600"
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
        )}

        {/* PROJECTS SECTION */}
        {activeTab === 'projects' && (
          <section className="bauhaus-card p-10">
            {/* Project section header */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Folder className="h-6 w-6 text-[#1976D2]" />
                <h2 className="text-2xl font-black uppercase tracking-wide text-[#0A0A0F]">Projects</h2>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button
                  className="bauhaus-btn h-10 px-6"
                >
                  <Plus className="h-4 w-4 mr-2" />
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
            <BubbleLoading 
              size="md" 
              message="Loading projects..." 
              className="py-12"
            />
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 projects-grid">
                {filteredProjects.map((project) => (
                  <Card
                    key={project.id}
                    className="bauhaus-card relative overflow-hidden"
                  >
                    <div
                      className="absolute h-2 w-full top-0 left-0"
                      style={{ backgroundColor: project.color || "#1976D2" }}
                    ></div>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-3 h-3 rounded-none border-2 border-[#0A0A0F]"
                            style={{
                              backgroundColor: project.color || "#1976D2",
                            }}
                          ></div>
                          <CardTitle className="text-lg text-gray-900">{project.name}</CardTitle>
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
        )}

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

      {/* Google Sheets Import Dialog */}
      {selectedProjectForImport && (
        <BoardImportDialog
          projectId={selectedProjectForImport.id}
          onSuccess={() => {
            setGoogleSheetsImportOpen(false);
            setSelectedProjectForImport(null);
            // Refresh data after successful import
            queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
            queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
          }}
          open={googleSheetsImportOpen}
          onOpenChange={(open) => {
            setGoogleSheetsImportOpen(open);
            if (!open) {
              setSelectedProjectForImport(null);
            }
          }}
        />
      )}

      {/* Share Blupi with a Friend Dialog */}
      <ShareFriendDialog 
        open={shareWithFriendOpen}
        onOpenChange={setShareWithFriendOpen}
      />

      {/* Profile Modal */}
      <ProfileModal 
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
      />

    </div>
  );
}