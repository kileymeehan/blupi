import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Building2, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Organization {
  id: string;
  name: string;
  slug: string;
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

  if (orgsLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg">
        <Building2 className="h-4 w-4 text-white/70" />
        <span className="text-sm text-white/70">Loading...</span>
      </div>
    );
  }

  if (organizations.length === 0) {
    return null;
  }

  if (organizations.length === 1) {
    return (
      <div 
        className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg"
        data-testid="org-badge-single"
      >
        <Building2 className="h-4 w-4 text-white" />
        <span className="text-sm font-medium text-white">
          {organizations[0].organization.name}
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg h-auto"
          data-testid="org-switcher-trigger"
        >
          <Building2 className="h-4 w-4 text-white" />
          <span className="text-sm font-medium text-white">
            {activeOrg?.name || "Select Organization"}
          </span>
          <ChevronDown className="h-3 w-3 text-white/70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.organizationId}
            onClick={() => {
              if (!org.isActive) {
                switchOrganization.mutate(org.organizationId);
              }
            }}
            className="cursor-pointer flex items-center justify-between"
            data-testid={`org-option-${org.organization.slug}`}
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{org.organization.name}</span>
            </div>
            {org.isActive && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
