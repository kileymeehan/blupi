import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5" />
              Project Members
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              Assign team members to this project
            </CardDescription>
          </div>
        </div>
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              disabled={availableMembers.length === 0}
              size="sm"
              className="w-full mt-2"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Assign Member
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
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAssignMember}
                disabled={!selectedUserId || assignMemberMutation.isPending}
              >
                {assignMemberMutation.isPending ? "Assigning..." : "Assign Member"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="pt-2">
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
          <div className="text-center py-4">
            <User className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              No members assigned yet
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {projectMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">
                      {(member.user?.username || member.user?.email || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">
                      {member.user?.username || member.user?.email}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{member.user?.email}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 ml-2">
                  <Select
                    value={member.role}
                    onValueChange={(role) => updateRoleMutation.mutate({ 
                      userId: member.userId, 
                      role 
                    })}
                  >
                    <SelectTrigger className="w-20 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-7 h-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => removeMemberMutation.mutate(member.userId)}
                    disabled={removeMemberMutation.isPending}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}