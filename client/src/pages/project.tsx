import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, UserPlus, Trash2, Archive, RotateCcw, MoreVertical, ExternalLink, FileText, Users, LinkIcon, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { formatDistanceToNowStrict } from "date-fns";
import { CreateBlueprintDialog } from "@/components/create-blueprint-dialog";
import { ProjectMembers } from "@/components/project-members";
import { PageHeader } from "@/components/page-header";
import { useState, useEffect, useRef } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Board, ProjectLink } from "@shared/schema";
import { StatusSelector } from "@/components/status-selector";
import { useToast } from "@/hooks/use-toast";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import { ColorPicker } from "@/components/color-picker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export default function Project() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [createBlueprintOpen, setCreateBlueprintOpen] = useState(false);
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [deleteBlueprintId, setDeleteBlueprintId] = useState<number | null>(null);
  const [archiveBlueprintId, setArchiveBlueprintId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projectDescription, setProjectDescription] = useState('');
  const [newDocumentTitle, setNewDocumentTitle] = useState('');
  const [newDocumentUrl, setNewDocumentUrl] = useState('');
  const [showAddLinkForm, setShowAddLinkForm] = useState(false);
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

  // Project description box: loads the saved text once, then autosaves a
  // second after typing stops (and on blur) without toasts
  const [overviewStatus, setOverviewStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const savedOverview = useRef<string | null>(null);
  useEffect(() => {
    savedOverview.current = null;
    setOverviewStatus('idle');
  }, [id]);
  useEffect(() => {
    if (project && savedOverview.current === null) {
      savedOverview.current = project.overview ?? '';
      setProjectDescription(project.overview ?? '');
    }
  }, [project]);
  const saveOverview = async (text: string) => {
    if (savedOverview.current === null || text === savedOverview.current) return;
    setOverviewStatus('saving');
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overview: text }),
      });
      if (!res.ok) throw new Error();
      savedOverview.current = text;
      queryClient.setQueryData(['/api/projects', id], (p: any) => (p ? { ...p, overview: text } : p));
      setOverviewStatus('saved');
    } catch {
      setOverviewStatus('error');
    }
  };
  useEffect(() => {
    const timer = setTimeout(() => saveOverview(projectDescription), 1000);
    return () => clearTimeout(timer);
  }, [projectDescription]);

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

  // Blueprint deletion mutation
  const deleteBlueprintMutation = useMutation({
    mutationFn: async (boardId: number) => {
      const response = await apiRequest('DELETE', `/api/boards/${boardId}`);
      if (!response.ok) throw new Error('Failed to delete blueprint');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', id, 'boards'] });
      toast({
        title: "Success",
        description: "Blueprint deleted successfully"
      });
      setDeleteBlueprintId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Blueprint archiving mutation
  const archiveBlueprintMutation = useMutation({
    mutationFn: async (boardId: number) => {
      const response = await apiRequest('PATCH', `/api/boards/${boardId}`, { status: 'archived' });
      if (!response.ok) throw new Error('Failed to archive blueprint');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', id, 'boards'] });
      toast({
        title: "Success",
        description: "Blueprint archived successfully"
      });
      setArchiveBlueprintId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message, 
        variant: "destructive"
      });
    }
  });

  // Add document mutation
  const linksKey = ['/api/projects', id, 'links'];
  const { data: documents = [] } = useQuery<ProjectLink[]>({
    queryKey: linksKey,
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}/links`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch links');
      return res.json();
    },
    enabled: !!id,
  });

  // Surface the server's validation message (e.g. "invalid URL") instead of a raw status
  const linkRequest = async (method: string, url: string, body?: unknown) => {
    const res = await fetch(url, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    return data;
  };

  const addDocumentMutation = useMutation({
    mutationFn: (document: { title: string; url: string }) =>
      linkRequest('POST', `/api/projects/${id}/links`, document),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: linksKey });
      setNewDocumentTitle('');
      setNewDocumentUrl('');
      setShowAddLinkForm(false);
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't add link", description: error.message, variant: "destructive" });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (linkId: number) => linkRequest('DELETE', `/api/projects/${id}/links/${linkId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: linksKey }),
    onError: (error: Error) => {
      toast({ title: "Couldn't remove link", description: error.message, variant: "destructive" });
    },
  });

  // Filter boards by archived status
  const activeBoards = boards.filter(board => board.status?.toLowerCase() !== 'archived');
  const archivedBoards = boards.filter(board => board.status?.toLowerCase() === 'archived');

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading project...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bauhaus-halftone-bg animate-fade-in">
      <PageHeader
        title={project?.name || 'Loading...'}
        description={project?.description}
        onTitleChange={async (newTitle) => {
          await updateProjectMutation.mutateAsync({ name: newTitle });
        }}
        rightContent={
          <div className="flex items-center gap-2">
            <ColorPicker
              color={project?.color || '#2E6A8E'}
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
              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-9"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <main className="max-w-[1440px] mx-auto px-6 py-6">
        {/* Project Title */}
        <div className="mb-8">
          <h1 className="text-5xl font-black text-ds-ink mb-2 uppercase tracking-tighter" style={{ fontFamily: 'Montserrat, sans-serif' }}>{project?.name || 'Loading...'}</h1>
          {project?.description && (
            <p className="text-lg font-bold text-ds-ink uppercase tracking-wide">{project.description}</p>
          )}
        </div>

        {/* Mobile sidebar toggle */}
        <div className="lg:hidden mb-4">
          <Button
            className="bauhaus-btn h-10 px-4 flex items-center gap-2"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            {sidebarOpen ? 'Hide' : 'Show'} Info
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1 space-y-6 order-2 lg:order-1">
            {/* Project Description Section */}
            <section className="bauhaus-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-ds-accent" />
                <h2 className="text-xl font-black uppercase tracking-widest text-ds-ink">Project Description</h2>
                <span className={`ml-auto text-xs ${overviewStatus === 'error' ? 'text-ds-danger' : 'text-gray-400'}`} aria-live="polite">
                  {overviewStatus === 'saving' ? 'Saving…' : overviewStatus === 'saved' ? 'Saved' : overviewStatus === 'error' ? "Couldn't save. Keep this page open and try again." : ''}
                </span>
              </div>
              <Textarea
                placeholder="Describe your project goals, scope, and objectives..."
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                onBlur={() => saveOverview(projectDescription)}
                maxLength={20000}
                className="min-h-[120px] resize-none border border-gray-200 rounded text-[15px] leading-relaxed text-ds-ink placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-ds-accent"
              />
            </section>

            {/* Blueprints Section */}
            <section className="bauhaus-card p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black uppercase tracking-widest text-ds-ink">Blueprints</h2>
                <Button onClick={() => setCreateBlueprintOpen(true)} className="bauhaus-btn h-10 px-6">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Create New Blueprint
                </Button>
              </div>

          {!showArchived ? (
            <>
              {activeBoards.length > 0 && (
              <table className="w-full table-fixed text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-[11px] font-bold uppercase tracking-widest text-gray-500">
                    <th className="pb-2 pl-3 font-bold">Name</th>
                    <th className="pb-2 w-[150px] font-bold">Status</th>
                    <th className="pb-2 w-[130px] font-bold hidden md:table-cell">Updated</th>
                    <th className="pb-2 w-[44px]"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                {activeBoards.map((board) => (
                  <tr
                    key={board.id}
                    onClick={() => navigate(`/board/${board.id}`)}
                    className="group cursor-pointer border-b border-gray-100 last:border-0 hover:bg-[color-mix(in_srgb,var(--ds-pop)_10%,transparent)] transition-colors"
                  >
                    <td className="py-3 pl-3 pr-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: project?.color || '#2E6A8E' }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <Link
                              href={`/board/${board.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="truncate font-bold text-ds-ink group-hover:underline underline-offset-2"
                            >
                              {board.name}
                            </Link>
                            {board.state === 'future' && (
                              <span className="flex-shrink-0 rounded-sm border border-violet-200 bg-violet-50 px-1.5 text-[10px] font-bold uppercase leading-4 tracking-wider text-violet-700">
                                Future
                              </span>
                            )}
                          </div>
                          {board.description && (
                            <p className="truncate text-sm text-gray-500">{board.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3" onClick={(e) => e.stopPropagation()}>
                      <StatusSelector
                        type="board"
                        variant="subtle"
                        value={board.status}
                        onChange={(status) => updateBoardStatus.mutate({ boardId: board.id, status })}
                        disabled={updateBoardStatus.isPending}
                      />
                    </td>
                    <td className="py-3 text-sm text-gray-500 whitespace-nowrap hidden md:table-cell" title={new Date(board.updatedAt).toLocaleString()}>
                      {formatDistanceToNowStrict(new Date(board.updatedAt), { addSuffix: true })}
                    </td>
                    <td className="py-3 pr-1 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-ds-ink hover:bg-black/5" aria-label={`Actions for ${board.name}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="border-2 border-[color:var(--card-border)] rounded">
                          <DropdownMenuItem onClick={() => setArchiveBlueprintId(board.id)} className="font-bold uppercase text-xs">
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDeleteBlueprintId(board.id)}
                            className="text-red-600 font-bold uppercase text-xs"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
              )}

              {activeBoards.length === 0 && !boardsLoading && (
                <div className="space-y-4">
                  <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
                    <CardHeader>
                      <CardTitle>No blueprints yet</CardTitle>
                      <CardDescription>Create your first blueprint for this project</CardDescription>
                    </CardHeader>
                  </Card>
                  
                  {archivedBoards.length > 0 && (
                    <div className="text-center">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowArchived(true)}
                        className="text-sm"
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        View Archived Blueprints ({archivedBoards.length})
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {activeBoards.length > 0 && archivedBoards.length > 0 && (
                <div className="text-center mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowArchived(true)}
                    className="text-sm"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    View Archived Blueprints ({archivedBoards.length})
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-700">Archived Blueprints</h3>
                <Button 
                  variant="outline" 
                  onClick={() => setShowArchived(false)}
                  className="text-sm"
                >
                  Back to Active Blueprints
                </Button>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {archivedBoards.map((board) => (
                  <Card key={board.id} className="relative overflow-hidden flex flex-col border border-gray-400 opacity-75">
                    <div
                      className="absolute inset-y-0 left-0 w-1 bg-gray-400"
                    />
                    <CardHeader className="p-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base text-gray-600">{board.name}</CardTitle>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          Archived
                        </span>
                      </div>
                      <CardDescription className="text-sm text-gray-500">{board.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex flex-col h-full mt-auto">
                      <div className="flex-grow"></div>
                      <div className="flex flex-col gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => updateBoardStatus.mutate({ boardId: board.id, status: 'Active' })}
                          disabled={updateBoardStatus.isPending}
                          className="w-full h-9 text-sm"
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Unarchive
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
            </section>
          </div>

          {/* Sidebar */}
          <div className={`w-full lg:w-1/4 space-y-6 order-1 lg:order-2 ${sidebarOpen ? 'block' : 'hidden lg:block'}`}>
            {/* Project Members Section */}
            {id && <ProjectMembers projectId={id} projectName={project?.name} />}

            {/* Documents & Links Section */}
            <section className="bauhaus-card p-6">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h2 className="flex items-center gap-2 text-base font-black uppercase tracking-widest text-ds-ink min-w-0">
                  <LinkIcon className="h-4 w-4 text-ds-accent flex-shrink-0" />
                  Documents & Links
                </h2>
                {!showAddLinkForm && (
                  <Button
                    variant="ghost"
                    onClick={() => setShowAddLinkForm(true)}
                    title="Add a link"
                    aria-label="Add link"
                    className="h-8 w-8 p-0 flex-shrink-0 text-ds-ink hover:bg-black/5"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Document list */}
              {documents.length > 0 && (
                <ul className="divide-y divide-gray-100">
                  {documents.map((doc) => (
                    <li key={doc.id} className="flex items-center gap-1 group/row">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={doc.url}
                        className="flex flex-1 min-w-0 items-center justify-between gap-2 py-2.5 group"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-ds-ink truncate group-hover:underline underline-offset-2">{doc.title}</div>
                          <div className="text-xs text-gray-500">
                            {doc.type === 'google_drive' ? 'Google Drive' : 'External link'}
                          </div>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-gray-300 group-hover:text-ds-ink" />
                      </a>
                      <Button
                        variant="ghost"
                        onClick={() => deleteDocumentMutation.mutate(doc.id)}
                        disabled={deleteDocumentMutation.isPending}
                        aria-label={`Remove ${doc.title}`}
                        className="h-7 w-7 p-0 flex-shrink-0 text-gray-300 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 hover:text-ds-danger hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {documents.length === 0 && !showAddLinkForm && (
                <p className="text-sm text-gray-500 py-2">
                  No documents added yet
                </p>
              )}

              {/* Add Link Form */}
              {showAddLinkForm && (
                <div className={`space-y-3 ${documents.length > 0 ? 'mt-4' : ''}`}>
                  <Input
                    placeholder="Title"
                    value={newDocumentTitle}
                    onChange={(e) => setNewDocumentTitle(e.target.value)}
                    className="h-9 border border-gray-200 rounded text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-ds-accent"
                  />
                  <Input
                    placeholder="URL"
                    value={newDocumentUrl}
                    onChange={(e) => setNewDocumentUrl(e.target.value)}
                    className="h-9 border border-gray-200 rounded text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-ds-accent"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        if (newDocumentTitle && newDocumentUrl) {
                          addDocumentMutation.mutate({ title: newDocumentTitle, url: newDocumentUrl });
                        }
                      }}
                      disabled={!newDocumentTitle || !newDocumentUrl || addDocumentMutation.isPending}
                      className="bauhaus-btn-blue flex-1 h-9"
                    >
                      Add
                    </Button>
                    <Button
                      onClick={() => {
                        setShowAddLinkForm(false);
                        setNewDocumentTitle('');
                        setNewDocumentUrl('');
                      }}
                      variant="ghost"
                      className="flex-1 h-9 text-xs font-bold uppercase tracking-wider hover:bg-black/5"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <CreateBlueprintDialog
        open={createBlueprintOpen}
        onOpenChange={setCreateBlueprintOpen}
        projectId={Number(id)}
      />

      <DeleteProjectDialog
        open={deleteProjectOpen}
        onOpenChange={setDeleteProjectOpen}
        projectId={Number(id)}
        projectName={project?.name || ''}
      />

      {/* Blueprint Delete Confirmation */}
      <AlertDialog open={!!deleteBlueprintId} onOpenChange={() => setDeleteBlueprintId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blueprint</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this blueprint? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteBlueprintId) {
                  deleteBlueprintMutation.mutate(deleteBlueprintId);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Blueprint Archive Confirmation */}
      <AlertDialog open={!!archiveBlueprintId} onOpenChange={() => setArchiveBlueprintId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Blueprint</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive this blueprint? You can unarchive it later from the archived blueprints section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (archiveBlueprintId) {
                  archiveBlueprintMutation.mutate(archiveBlueprintId);
                }
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}