import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Building2, Check, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

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

export function OrganizationSettings() {
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

  if (orgsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-[#302E87]" />
          Organization
        </CardTitle>
        <CardDescription>
          Manage your organization settings and switch between workspaces
        </CardDescription>
      </CardHeader>
      <CardContent>
        {organizations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>You're not a member of any organization yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Your Organizations</h3>
            {organizations.map((org) => (
              <div
                key={org.organizationId}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  org.isActive 
                    ? 'border-[#302E87] bg-[#302E87]/5' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                data-testid={`org-card-${org.organization.slug}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${org.isActive ? 'bg-[#302E87]' : 'bg-gray-100'}`}>
                    <Building2 className={`h-5 w-5 ${org.isActive ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{org.organization.name}</span>
                      {org.isActive && (
                        <Badge variant="secondary" className="text-xs bg-[#302E87] text-white">
                          Active
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-gray-500 capitalize">{org.role}</span>
                  </div>
                </div>
                
                {org.isActive ? (
                  <div className="flex items-center gap-2 text-[#302E87]">
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
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
