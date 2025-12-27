import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, UserPlus, Trash2, Archive, RotateCcw, MoreVertical, ExternalLink, FileText, Users, LinkIcon, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { CreateBlueprintDialog } from "@/components/create-blueprint-dialog";
import { InviteProjectDialog } from "@/components/invite-project-dialog";
import { ProjectMembers } from "@/components/project-members";
import { PageHeader } from "@/components/page-header";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Board } from "@shared/schema";
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
  const [createBlueprintOpen, setCreateBlueprintOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [deleteBlueprintId, setDeleteBlueprintId] = useState<number | null>(null);
  const [archiveBlueprintId, setArchiveBlueprintId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projectDescription, setProjectDescription] = useState('');
  const [documents, setDocuments] = useState<{ id: string; title: string; url: string; type: 'google_drive' | 'link' }[]>([]);
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
  const addDocumentMutation = useMutation({
    mutationFn: async (document: { title: string; url: string; type: 'google_drive' | 'link' }) => {
      // In a real implementation, this would save to the database
      const newDoc = { ...document, id: Date.now().toString() };
      setDocuments(prev => [...prev, newDoc]);
      return newDoc;
    },
    onSuccess: () => {
      setNewDocumentTitle('');
      setNewDocumentUrl('');
      setShowAddLinkForm(false);
      toast({
        title: "Success",
        description: "Document added successfully"
      });
    }
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
    <div className="min-h-screen bg-[#F0EEE9] animate-fade-in">
      <PageHeader
        title={project?.name || 'Loading...'}
        description={project?.description}
        onTitleChange={async (newTitle) => {
          await updateProjectMutation.mutateAsync({ name: newTitle });
        }}
        rightContent={
          <div className="flex items-center gap-2">
            <ColorPicker
              color={project?.color || '#4F46E5'}
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
          <h1 className="text-5xl font-black text-[#0A0A0F] mb-2 uppercase tracking-tighter" style={{ fontFamily: 'Montserrat, sans-serif' }}>{project?.name || 'Loading...'}</h1>
          {project?.description && (
            <p className="text-lg font-bold text-[#0A0A0F] uppercase tracking-wide">{project.description}</p>
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
                <FileText className="h-5 w-5 text-[#1976D2]" />
                <h2 className="text-xl font-black uppercase tracking-widest text-[#0A0A0F]">Project Description</h2>
              </div>
              <Textarea
                placeholder="Describe your project goals, scope, and objectives..."
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                className="min-h-[120px] resize-none border-4 border-[#0A0A0F] rounded-none focus-visible:ring-0 focus-visible:border-[#1976D2] font-bold"
              />
            </section>

            {/* Blueprints Section */}
            <section className="bauhaus-card p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black uppercase tracking-widest text-[#0A0A0F]">Blueprints</h2>
                <Button onClick={() => setCreateBlueprintOpen(true)} className="bauhaus-btn h-10 px-6">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Create New Blueprint
                </Button>
              </div>

          {!showArchived ? (
            <>
              <div className="space-y-4">
                {activeBoards.map((board) => (
                  <div key={board.id} className="flex items-center justify-between p-4 bg-white border-4 border-[#0A0A0F] hover:bg-[#FFD600] transition-colors group">
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className="w-4 h-4 border-2 border-[#0A0A0F] flex-shrink-0"
                        style={{ backgroundColor: project?.color || '#1976D2' }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black uppercase tracking-widest text-[#1976D2] group-hover:text-[#0A0A0F] truncate">{board.name}</h3>
                        {board.description && (
                          <p className="text-sm font-bold text-[#0A0A0F] truncate">{board.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <StatusSelector
                        type="board"
                        value={board.status}
                        onChange={(status) => updateBoardStatus.mutate({ boardId: board.id, status })}
                        disabled={updateBoardStatus.isPending}
                      />
                      <Button asChild className="bauhaus-btn h-8 px-4 text-xs">
                        <Link href={`/board/${board.id}`}>View</Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-black/10">
                            <MoreVertical className="h-4 w-4 text-[#0A0A0F]" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="border-4 border-[#0A0A0F] rounded-none">
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
                    </div>
                  </div>
                ))}
              </div>

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
            <div className="bauhaus-card p-6">
              {id && <ProjectMembers projectId={id} />}
            </div>

            {/* Documents & Links Section */}
            <section className="bauhaus-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <LinkIcon className="h-5 w-5 text-[#1976D2]" />
                <h2 className="text-xl font-black uppercase tracking-widest text-[#0A0A0F]">Documents & Links</h2>
              </div>
              
              {/* Document list */}
              <div className="space-y-2 mb-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-white border-2 border-[#0A0A0F] hover:bg-[#FFD600] transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black uppercase tracking-widest text-[#0A0A0F] truncate">{doc.title}</div>
                      <div className="text-[10px] font-bold uppercase tracking-tighter text-[#6B7280] group-hover:text-[#0A0A0F]">
                        {doc.type === 'google_drive' ? 'Google Drive' : 'External Link'}
                      </div>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 p-2 hover:bg-black/10 rounded-none"
                    >
                      <ExternalLink className="h-4 w-4 text-[#0A0A0F]" />
                    </a>
                  </div>
                ))}
                {documents.length === 0 && !showAddLinkForm && (
                  <div className="text-sm text-gray-500 text-center py-6">
                    No documents added yet
                  </div>
                )}
              </div>

              {/* Add Link Form or CTA Button */}
              {!showAddLinkForm ? (
                <Button
                  onClick={() => setShowAddLinkForm(true)}
                  className="bauhaus-btn w-full h-12"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Link
                </Button>
              ) : (
                <div className="space-y-3">
                  <Input
                    placeholder="Title"
                    value={newDocumentTitle}
                    onChange={(e) => setNewDocumentTitle(e.target.value)}
                    className="border-4 border-[#0A0A0F] rounded-none focus-visible:ring-0 font-black uppercase text-xs"
                  />
                  <Input
                    placeholder="URL"
                    value={newDocumentUrl}
                    onChange={(e) => setNewDocumentUrl(e.target.value)}
                    className="border-4 border-[#0A0A0F] rounded-none focus-visible:ring-0 font-black text-xs"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        if (newDocumentTitle && newDocumentUrl) {
                          const docType = newDocumentUrl.includes('drive.google.com') ? 'google_drive' : 'link';
                          addDocumentMutation.mutate({
                            title: newDocumentTitle,
                            url: newDocumentUrl,
                            type: docType
                          });
                        }
                      }}
                      disabled={!newDocumentTitle || !newDocumentUrl || addDocumentMutation.isPending}
                      className="bauhaus-btn-blue flex-1 h-10"
                    >
                      Add
                    </Button>
                    <Button
                      onClick={() => {
                        setShowAddLinkForm(false);
                        setNewDocumentTitle('');
                        setNewDocumentUrl('');
                      }}
                      className="bauhaus-btn flex-1 h-10"
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

      <InviteProjectDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
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