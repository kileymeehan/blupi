import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-simple-auth";
import { UserPlus, Users, Trash2, Crown, User } from "lucide-react";

interface ProjectMember {
  id: number;
  projectId: number;
  userId: number;
  role: string;
  status: string;
  invitedAt: string;
  user?: {
    username: string;
    email: string;
  };
}

interface TeamMember {
  id: number;
  email: string;
  role: string;
  status: string;
  userId: number;
  user?: {
    username: string;
    email: string;
  };
}

interface ProjectMembersProps {
  projectId: string;
}

export function ProjectMembers({ projectId }: ProjectMembersProps) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState("member");
  const { toast } = useToast();
  const { user } = useAuth();

  // Get organization ID from user (same logic as team management)
  const getOrganizationId = () => {
    if (!user?.uid) return null;
    
    // Handle different session types:
    // - Password login: integer user ID
    // - Google OAuth: Firebase UID string that gets resolved to database user ID
    if (typeof user.uid === 'number') {
      return user.uid;
    }
    
    if (typeof user.uid === 'string') {
      // Try parsing as integer first (for password accounts)
      const parsed = parseInt(user.uid);
      if (!isNaN(parsed)) {
        return parsed;
      }
      
      // For Firebase UIDs, the session endpoint should have resolved them to database user IDs
      console.warn('[ProjectMembers] Cannot resolve organization ID for Firebase UID:', user.uid);
      return null;
    }
    
    return null;
  };
  
  const organizationId = getOrganizationId();

  // Get project members
  const { data: projectMembers = [], isLoading: membersLoading } = useQuery<ProjectMember[]>({
    queryKey: ["/api/projects", projectId, "members"],
    queryFn: () => fetch(`/api/projects/${projectId}/members`).then(res => res.json()),
    enabled: !!projectId,
  });

  // Get all team members (to assign from) - using user's own organization
  const { data: teamMembers = [], isLoading: teamMembersLoading, error: teamMembersError } = useQuery<TeamMember[]>({
    queryKey: ["/api/teams", organizationId, "members"],
    queryFn: async () => {
      console.log('[ProjectMembers] Fetching team members from organization:', organizationId);
      const res = await fetch(`/api/teams/${organizationId}/members`);
      console.log('[ProjectMembers] Team API response status:', res.status);
      
      if (!res.ok) {
        console.error('[ProjectMembers] Team API failed with status:', res.status);
        const errorText = await res.text();
        console.error('[ProjectMembers] Team API error response:', errorText);
        return [];
      }
      
      const data = await res.json();
      console.log('[ProjectMembers] Team API success, received members:', data.length);
      return data;
    },
    enabled: !!organizationId, // Only fetch when we have a valid organization ID
    retry: false, // Don't retry on 403 errors
  });

  // Safely filter out already assigned members
  const availableMembers = Array.isArray(teamMembers) ? teamMembers.filter(
    teamMember => !projectMembers.some(projectMember => projectMember.userId === teamMember.userId)
  ) : [];
  
  // Add comprehensive logging for debugging
  console.log('[ProjectMembers] State debug:');
  console.log('  - projectId:', projectId);
  console.log('  - projectMembers count:', projectMembers.length);
  console.log('  - teamMembers count:', teamMembers.length);
  console.log('  - teamMembersLoading:', teamMembersLoading);
  console.log('  - teamMembersError:', teamMembersError);
  console.log('  - availableMembers count:', availableMembers.length);
  console.log('  - button disabled:', availableMembers.length === 0);

  const assignMemberMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role })
      });
      if (!response.ok) throw new Error('Failed to assign member');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "members"] });
      setAssignDialogOpen(false);
      setSelectedUserId("");
      setSelectedRole("member");
      toast({
        title: "Member assigned",
        description: "Team member has been assigned to the project"
      });
    },
    onError: () => {
      toast({
        title: "Assignment failed",
        description: "Failed to assign team member to project",
        variant: "destructive"
      });
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to remove member');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "members"] });
      toast({
        title: "Member removed",
        description: "Team member has been removed from the project"
      });
    },
    onError: () => {
      toast({
        title: "Removal failed",
        description: "Failed to remove team member from project",
        variant: "destructive"
      });
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const response = await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      if (!response.ok) throw new Error('Failed to update role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "members"] });
      toast({
        title: "Role updated",
        description: "Member role has been updated"
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update member role",
        variant: "destructive"
      });
    }
  });

  const handleAssignMember = () => {
    if (!selectedUserId) return;
    assignMemberMutation.mutate({ 
      userId: parseInt(selectedUserId), 
      role: selectedRole 
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive" className="text-xs"><Crown className="w-3 h-3 mr-1" />Admin</Badge>;
      case 'editor':
        return <Badge variant="secondary" className="text-xs">Editor</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Member</Badge>;
    }
  };

  return (
    <section className="bauhaus-card p-6">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="flex items-center gap-2 text-base font-black uppercase tracking-widest text-[#0A0A0F] min-w-0">
          <Users className="w-4 h-4 text-[#1976D2] flex-shrink-0" />
          Project Members
        </h2>
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              disabled={availableMembers.length === 0}
              title={availableMembers.length === 0 ? "Everyone in the workspace is already on this project" : "Assign a team member"}
              aria-label="Assign member"
              className="h-8 w-8 p-0 flex-shrink-0 text-[#0A0A0F] hover:bg-black/5"
            >
              <UserPlus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Team Member</DialogTitle>
              <DialogDescription>
                Select a team member to assign to this project
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Team Member</label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.map((member) => (
                      <SelectItem key={member.userId} value={member.userId.toString()}>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs">
                              {(member.user?.username || member.email).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm">{member.user?.username || member.email}</span>
                            <span className="text-xs text-muted-foreground">{member.email}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Project Role</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button className="bauhaus-btn" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="bauhaus-btn-blue"
                onClick={handleAssignMember}
                disabled={!selectedUserId || assignMemberMutation.isPending}
              >
                {assignMemberMutation.isPending ? "Assigning..." : "Assign Member"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        {membersLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center space-x-2 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-2 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : projectMembers.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">
            No members assigned yet
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {projectMembers.map((member) => (
              <li key={member.id} className="flex items-center justify-between py-2.5 group">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="text-xs font-bold bg-gray-100 text-gray-600">
                      {(member.user?.username || member.user?.email || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-[#0A0A0F] truncate">
                      {member.user?.username || member.user?.email}
                    </div>
                    {member.user?.username && (
                      <div className="text-xs text-gray-500 truncate">{member.user?.email}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-0.5 ml-2">
                  <Select
                    value={member.role}
                    onValueChange={(role) => updateRoleMutation.mutate({ 
                      userId: member.userId, 
                      role 
                    })}
                  >
                    <SelectTrigger className="w-auto h-7 gap-1 px-2 border-0 shadow-none text-xs text-gray-500 hover:bg-black/5 hover:text-[#0A0A0F] focus:ring-0 focus:ring-offset-0 capitalize [&>svg]:h-3 [&>svg]:w-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-2 border-[color:var(--card-border)] rounded">
                      <SelectItem value="member" className="font-bold text-xs">Member</SelectItem>
                      <SelectItem value="editor" className="font-bold text-xs">Editor</SelectItem>
                      <SelectItem value="admin" className="font-bold text-xs">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="ghost"
                    className="w-7 h-7 p-0 text-gray-300 hover:text-[#E53935] hover:bg-red-50 rounded"
                    onClick={() => removeMemberMutation.mutate(member.userId)}
                    disabled={removeMemberMutation.isPending}
                    aria-label={`Remove ${member.user?.username || member.user?.email}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}