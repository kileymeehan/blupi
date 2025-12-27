import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Building2, Check, Loader2, Plus, Pencil, Users, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface OrganizationSettings {
  logoUrl?: string;
  primaryColor?: string;
  allowPublicBoards?: boolean;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  settings?: OrganizationSettings;
}

interface UserOrganization {
  id: number;
  userId: number;
  organizationId: string;
  role: string;
  isActive: boolean;
  organization: Organization;
}

function MemberCount({ organizationId }: { organizationId: string }) {
  const { data, isLoading } = useQuery<{ count: number }>({
    queryKey: ['/api/organizations', organizationId, 'member-count'],
    queryFn: async () => {
      const res = await fetch(`/api/organizations/${organizationId}/member-count`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to fetch member count');
      return res.json();
    }
  });

  if (isLoading) {
    return <span className="text-xs text-gray-400">...</span>;
  }

  const count = data?.count ?? 0;
  return (
    <span className="text-xs text-gray-500 flex items-center gap-1 font-bold uppercase tracking-wider">
      <Users className="h-3 w-3" />
      {count} {count === 1 ? 'member' : 'members'}
    </span>
  );
}

export function OrganizationSettings() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const { data: organizations = [], isLoading: orgsLoading } = useQuery<UserOrganization[]>({
    queryKey: ['/api/organizations'],
  });

  const removeLogo = useMutation({
    mutationFn: async (organizationId: string) => {
      const response = await fetch(`/api/organizations/${organizationId}/logo`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove logo');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/organizations/active'] });
      toast({
        title: "Logo removed",
        description: "Organization logo has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove logo",
        variant: "destructive",
      });
    },
  });

  const switchOrganization = useMutation({
    mutationFn: async (organizationId: string) => {
      await apiRequest('POST', `/api/organizations/${organizationId}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/organizations/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      toast({
        title: "Organization switched",
        description: "Your workspace has been updated. Refreshing...",
      });
      setTimeout(() => window.location.reload(), 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to switch organization",
        variant: "destructive",
      });
    },
  });

  const createOrganization = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest('POST', '/api/organizations', { name });
      return response.json();
    },
    onSuccess: (org) => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/organizations/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/boards'] });
      setCreateDialogOpen(false);
      setNewOrgName("");
      toast({
        title: "Organization created",
        description: `"${org.name}" has been created and set as your active workspace.`,
      });
      setTimeout(() => window.location.reload(), 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create organization",
        variant: "destructive",
      });
    },
  });

  const renameOrganization = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await apiRequest('PATCH', `/api/organizations/${id}`, { name });
      return response.json();
    },
    onSuccess: (org) => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/organizations/active'] });
      setEditingOrgId(null);
      setEditName("");
      toast({
        title: "Organization renamed",
        description: `Organization has been renamed to "${org.name}".`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to rename organization",
        variant: "destructive",
      });
    },
  });

  const handleCreateOrg = () => {
    if (newOrgName.trim()) {
      createOrganization.mutate(newOrgName.trim());
    }
  };

  const handleStartEdit = (org: UserOrganization) => {
    setEditingOrgId(org.organizationId);
    setEditName(org.organization.name);
  };

  const handleSaveEdit = () => {
    if (editingOrgId && editName.trim()) {
      renameOrganization.mutate({ id: editingOrgId, name: editName.trim() });
    }
  };

  const handleCancelEdit = () => {
    setEditingOrgId(null);
    setEditName("");
  };

  const canEdit = (role: string) => role === 'owner' || role === 'admin';

  if (orgsLoading) {
    return (
      <Card className="border-4 border-[#0A0A0F] rounded-none shadow-[8px_8px_0px_0px_#0A0A0F] bg-white overflow-hidden">
        <CardHeader className="border-b-4 border-[#0A0A0F] bg-[#0A0A0F] text-white">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#FFD600]" />
                Organization
              </CardTitle>
              <CardDescription className="text-gray-300 font-medium">
                Manage your organization settings and switch between workspaces
              </CardDescription>
            </div>
            <div className="h-10 w-32 bg-white/20 border-2 border-white/40 animate-pulse rounded-none" />
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border-4 border-[#0A0A0F] bg-gray-50 animate-pulse">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-12 w-12 bg-gray-200 border-2 border-[#0A0A0F] rounded-none" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-gray-200" />
                      <div className="h-3 w-24 bg-gray-100" />
                    </div>
                  </div>
                  <div className="h-8 w-20 bg-gray-200 border-2 border-[#0A0A0F]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-4 border-[#0A0A0F] rounded-none shadow-[8px_8px_0px_0px_#0A0A0F] bg-white overflow-hidden">
      <CardHeader className="border-b-4 border-[#0A0A0F] bg-[#0A0A0F] text-white">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#FFD600]" />
              Organization
            </CardTitle>
            <CardDescription className="text-gray-300 font-medium">
              Manage your organization settings and switch between workspaces
            </CardDescription>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-white text-[#0A0A0F] border-2 border-[#0A0A0F] rounded-none shadow-[2px_2px_0px_0px_#FFD600] hover:bg-[#FFD600] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] font-bold uppercase tracking-wide transition-all"
                data-testid="create-org-button"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Organization
              </Button>
            </DialogTrigger>
            <DialogContent className="border-2 border-[#0A0A0F] rounded-none shadow-[8px_8px_0px_0px_#0A0A0F]">
              <DialogHeader className="border-b-2 border-[#0A0A0F] pb-4">
                <DialogTitle className="text-[#0A0A0F] font-black uppercase tracking-tight">Create New Organization</DialogTitle>
                <DialogDescription className="text-gray-600 font-medium">
                  Create a new workspace for your team to collaborate on projects and blueprints.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name" className="font-bold uppercase tracking-wide text-xs text-[#0A0A0F]">Organization Name</Label>
                  <Input
                    id="org-name"
                    placeholder="e.g., My Company"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    className="border-2 border-[#0A0A0F] rounded-none focus:ring-[#FFD600]"
                    data-testid="org-name-input"
                  />
                </div>
              </div>
              <DialogFooter className="pt-4 border-t-2 border-[#0A0A0F]">
                <Button
                  variant="ghost"
                  onClick={() => setCreateDialogOpen(false)}
                  className="rounded-none border-2 border-transparent hover:border-[#0A0A0F] font-bold uppercase tracking-wide"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateOrg}
                  disabled={!newOrgName.trim() || createOrganization.isPending}
                  className="bg-[#0A0A0F] text-white border-2 border-[#0A0A0F] rounded-none shadow-[2px_2px_0px_0px_#FFD600] hover:bg-[#FFD600] hover:text-[#0A0A0F] hover:shadow-none font-bold uppercase tracking-wide transition-all"
                  data-testid="submit-create-org"
                >
                  {createOrganization.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Create Organization
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {organizations.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-[#0A0A0F] rounded-none bg-gray-50">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="mb-6 font-medium text-gray-600 uppercase tracking-wide">You're not a member of any organization yet.</p>
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              className="bg-[#0A0A0F] text-white border-2 border-[#0A0A0F] rounded-none shadow-[4px_4px_0px_0px_#FFD600] hover:bg-[#FFD600] hover:text-[#0A0A0F] hover:shadow-none font-bold uppercase tracking-wide transition-all"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Organization
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-[#0A0A0F] mb-4">Your Organizations</h3>
            <div className="grid gap-4">
              {organizations.map((org) => (
                <div
                  key={org.organizationId}
                  className={`p-4 border-4 transition-all ${
                    org.isActive 
                      ? 'border-[#0A0A0F] bg-[#FFD600]/10 shadow-[4px_4px_0px_0px_#0A0A0F]' 
                      : 'border-[#0A0A0F] bg-white hover:bg-gray-50 shadow-[2px_2px_0px_0px_#0A0A0F]'
                  }`}
                  data-testid={`org-card-${org.organization.slug}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="relative group flex-shrink-0">
                        {org.organization.settings?.logoUrl ? (
                          <div className="relative border-2 border-[#0A0A0F] rounded-none overflow-hidden bg-white">
                            <img 
                              src={org.organization.settings.logoUrl}
                              alt={org.organization.name}
                              className="h-12 w-12 object-contain"
                            />
                            {canEdit(org.role) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute top-0 right-0 h-5 w-5 p-0 bg-white border-l border-b border-[#0A0A0F] rounded-none opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                                onClick={() => removeLogo.mutate(org.organizationId)}
                                disabled={removeLogo.isPending}
                              >
                                <X className="h-3 w-3 text-red-600" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className={`h-12 w-12 border-2 border-[#0A0A0F] rounded-none flex items-center justify-center ${org.isActive ? 'bg-[#0A0A0F]' : 'bg-gray-100'}`}>
                            <Building2 className={`h-6 w-6 ${org.isActive ? 'text-white' : 'text-[#0A0A0F]'}`} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingOrgId === org.organizationId ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-8 border-2 border-[#0A0A0F] rounded-none focus:ring-[#FFD600]"
                              autoFocus
                            />
                            <Button size="sm" onClick={handleSaveEdit} className="h-8 bg-[#0A0A0F] text-white rounded-none border-2 border-[#0A0A0F]">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8 rounded-none border-2 border-[#0A0A0F]">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-black uppercase tracking-tight text-[#0A0A0F]">{org.organization.name}</span>
                              {org.isActive && (
                                <Badge className="bg-[#1976D2] text-white rounded-none border-2 border-[#0A0A0F] font-bold text-[10px] uppercase px-1.5 py-0">
                                  Current
                                </Badge>
                              )}
                              {canEdit(org.role) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 hover:bg-[#FFD600] rounded-none border border-transparent hover:border-[#0A0A0F]"
                                  onClick={() => handleStartEdit(org)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs font-bold uppercase tracking-wide text-gray-500">
                              <span className="bg-gray-100 px-1.5 py-0.5 border border-gray-300 text-[#0A0A0F]">{org.role}</span>
                              <MemberCount organizationId={org.organizationId} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {!org.isActive && editingOrgId !== org.organizationId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => switchOrganization.mutate(org.organizationId)}
                        disabled={switchOrganization.isPending}
                        className="bg-white text-[#0A0A0F] border-2 border-[#0A0A0F] rounded-none shadow-[2px_2px_0px_0px_#0A0A0F] hover:bg-[#FFD600] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] font-bold uppercase tracking-wide transition-all"
                      >
                        Switch
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
