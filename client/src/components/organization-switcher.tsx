import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Building2, ChevronDown, Check, Plus, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Organization {
  id: string;
  name: string;
  slug: string;
  settings?: {
    logoUrl?: string;
  };
}

interface UserOrganization {
  id: number;
  userId: number;
  organizationId: string;
  role: string;
  isActive: boolean;
  organization: Organization;
}

export function OrganizationSwitcher() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");

  const { data: organizations = [], isLoading: orgsLoading } = useQuery<UserOrganization[]>({
    queryKey: ['/api/organizations'],
  });

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
        description: "Your workspace has been updated.",
      });
      window.location.reload();
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

  const handleCreateOrg = () => {
    if (newOrgName.trim()) {
      createOrganization.mutate(newOrgName.trim());
    }
  };

  if (orgsLoading) {
    return (
      <div className="bg-white rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm border border-gray-200">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  if (organizations.length === 0) {
    return null;
  }

  const OrgLogo = ({ org, size = "sm" }: { org?: Organization | null; size?: "sm" | "md" }) => {
    const sizeClass = size === "sm" ? "h-5 w-5" : "h-8 w-8";
    const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
    
    if (org?.settings?.logoUrl) {
      return (
        <img
          src={org.settings.logoUrl}
          alt={org.name}
          className={`${sizeClass} object-contain rounded`}
        />
      );
    }
    return (
      <div className={`${sizeClass} bg-[#302E87] rounded flex items-center justify-center`}>
        <Building2 className={`${iconSize} text-white`} />
      </div>
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="bg-white hover:bg-gray-50 text-gray-800 rounded-lg px-3 py-2 h-auto flex items-center gap-2 shadow-sm border border-gray-200"
            data-testid="org-switcher-trigger"
          >
            <OrgLogo org={activeOrg} size="sm" />
            <span className="font-medium text-sm max-w-[150px] truncate">
              {activeOrg?.name || "Select Organization"}
            </span>
            {organizations.length > 1 && (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {organizations.map((userOrg) => (
            <DropdownMenuItem
              key={userOrg.organizationId}
              onClick={() => {
                if (!userOrg.isActive) {
                  switchOrganization.mutate(userOrg.organizationId);
                }
              }}
              className={`cursor-pointer py-3 ${userOrg.isActive ? 'bg-blue-50' : ''}`}
              data-testid={`org-option-${userOrg.organization.slug}`}
            >
              <div className="flex items-center gap-3 w-full">
                <OrgLogo org={userOrg.organization} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{userOrg.organization.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{userOrg.role}</p>
                </div>
                {userOrg.isActive && (
                  <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => setCreateDialogOpen(true)}
            className="cursor-pointer py-3"
            data-testid="create-new-org-dropdown"
          >
            <Plus className="h-4 w-4 mr-2 text-gray-500" />
            Create New Organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Create a new workspace for your team. You can invite members and add a logo after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="Enter organization name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateOrg();
                  }
                }}
                data-testid="input-org-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setNewOrgName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateOrg}
              disabled={!newOrgName.trim() || createOrganization.isPending}
              className="bg-[#302E87] hover:bg-[#252370]"
              data-testid="button-create-org"
            >
              {createOrganization.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
