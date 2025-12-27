import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Building2, Check, Loader2, Plus, Pencil, Users, Upload, X } from "lucide-react";
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
    <span className="text-xs text-gray-500 flex items-center gap-1">
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
  const [uploadingLogoFor, setUploadingLogoFor] = useState<string | null>(null);

  const { data: organizations = [], isLoading: orgsLoading } = useQuery<UserOrganization[]>({
    queryKey: ['/api/organizations'],
  });

  const uploadLogo = useMutation({
    mutationFn: async ({ organizationId, file }: { organizationId: string; file: File }) => {
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await fetch(`/api/organizations/${organizationId}/logo`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload logo');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/organizations/active'] });
      setUploadingLogoFor(null);
      toast({
        title: "Logo uploaded",
        description: "Organization logo has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    },
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

  const handleLogoUpload = (organizationId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Logo must be less than 2MB",
          variant: "destructive",
        });
        return;
      }
      setUploadingLogoFor(organizationId);
      uploadLogo.mutate({ organizationId, file });
    }
  };

  const { data: activeOrg } = useQuery<Organization | null>({
    queryKey: ['/api/organizations/active'],
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#4D629B]" />
                Organization
              </CardTitle>
              <CardDescription className="mt-1.5">
                Manage your organization settings and switch between workspaces
              </CardDescription>
            </div>
            <div className="h-9 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Your Organizations</h3>
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg border border-gray-200 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-12 w-12 bg-gray-200 rounded-lg animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-9 w-20 bg-gray-200 rounded animate-pulse flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#302E87]" />
              Organization
            </CardTitle>
            <CardDescription className="mt-1.5">
              Manage your organization settings and switch between workspaces
            </CardDescription>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-primary hover:bg-primary/90"
                data-testid="create-org-button"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Organization
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Organization</DialogTitle>
                <DialogDescription>
                  Create a new workspace for your team to collaborate on projects and blueprints.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    placeholder="e.g., My Company"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newOrgName.trim()) {
                        handleCreateOrg();
                      }
                    }}
                    data-testid="org-name-input"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateOrg}
                  disabled={!newOrgName.trim() || createOrganization.isPending}
                  className="bg-[#302E87] hover:bg-[#252371]"
                  data-testid="submit-create-org"
                >
                  {createOrganization.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Create Organization
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {organizations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="mb-4">You're not a member of any organization yet.</p>
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              className="bg-[#302E87] hover:bg-[#252371]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Organization
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Your Organizations</h3>
            {organizations.map((org) => (
              <div
                key={org.organizationId}
                className={`p-4 rounded-lg border ${
                  org.isActive 
                    ? 'border-[#302E87] bg-[#302E87]/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                data-testid={`org-card-${org.organization.slug}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative group flex-shrink-0">
                      {org.organization.settings?.logoUrl ? (
                        <div className="relative">
                          <img 
                            src={org.organization.settings.logoUrl}
                            alt={org.organization.name}
                            className="h-12 w-12 object-contain rounded-lg border border-gray-200 bg-white"
                          />
                          {canEdit(org.role) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute -top-2 -right-2 h-5 w-5 p-0 bg-white border border-gray-200 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeLogo.mutate(org.organizationId)}
                              disabled={removeLogo.isPending}
                              data-testid={`remove-logo-${org.organization.slug}`}
                            >
                              <X className="h-3 w-3 text-gray-500" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${org.isActive ? 'bg-[#302E87]' : 'bg-gray-100'}`}>
                          <Building2 className={`h-6 w-6 ${org.isActive ? 'text-white' : 'text-gray-600'}`} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingOrgId === org.organizationId ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          data-testid="edit-org-name-input"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleSaveEdit}
                          disabled={!editName.trim() || renameOrganization.isPending}
                          className="h-8 px-2"
                          data-testid="save-org-name"
                        >
                          {renameOrganization.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                          className="h-8 px-2"
                          data-testid="cancel-edit-org"
                        >
                          <span className="text-gray-500">Cancel</span>
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{org.organization.name}</span>
                          {org.isActive && (
                            <span 
                              className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-[#302E87] text-white font-medium select-none"
                              data-testid="active-badge"
                            >
                              Active
                            </span>
                          )}
                          {canEdit(org.role) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                              onClick={() => handleStartEdit(org)}
                              data-testid={`edit-org-${org.organization.slug}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-sm text-gray-500 capitalize">{org.role}</span>
                          <MemberCount organizationId={org.organizationId} />
                        </div>
                      </>
                    )}
                    </div>
                  </div>
                  
                  {editingOrgId !== org.organizationId && (
                    org.isActive ? (
                      <div className="flex items-center gap-2 text-[#302E87] flex-shrink-0">
                        <Check className="h-5 w-5" />
                        <span className="text-sm font-medium">Current</span>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => switchOrganization.mutate(org.organizationId)}
                        disabled={switchOrganization.isPending}
                        data-testid={`switch-org-${org.organization.slug}`}
                      >
                        {switchOrganization.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Switch'
                        )}
                      </Button>
                    )
                  )}
                </div>
                
                {canEdit(org.role) && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id={`logo-upload-${org.organizationId}`}
                        onChange={(e) => handleLogoUpload(org.organizationId, e)}
                      />
                      <label htmlFor={`logo-upload-${org.organizationId}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          asChild
                          disabled={uploadingLogoFor === org.organizationId}
                        >
                          <span className="cursor-pointer">
                            {uploadingLogoFor === org.organizationId ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Upload className="h-3 w-3 mr-1" />
                            )}
                            {org.organization.settings?.logoUrl ? 'Change Logo' : 'Add Logo'}
                          </span>
                        </Button>
                      </label>
                      <span className="text-xs text-gray-400">Max 2MB (PNG, JPG)</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
