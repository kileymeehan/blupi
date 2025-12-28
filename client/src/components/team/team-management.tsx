import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  Trash2,
  Check,
  X,
  Clock,
  ChevronDown,
  RotateCcw,
  Building2
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-simple-auth";

interface TeamMember {
  id: number;
  email: string;
  role: string;
  status: string;
  invitedAt: string;
  lastAccessAt?: string;
  user?: {
    username: string;
    email: string;
  };
}

interface InviteTeamMemberForm {
  email: string;
  role: string;
  teamName: string;
  inviterName: string;
}

interface PendingInvitation {
  id: number;
  email: string;
  role: string;
  teamName: string;
  inviterName: string;
  createdAt: string;
  expiresAt: string;
  status: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export default function TeamManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  
  const { data: activeOrg } = useQuery<Organization | null>({
    queryKey: ['/api/organizations/active'],
  });
  
  const [inviteForm, setInviteForm] = useState<InviteTeamMemberForm>({
    email: "",
    role: "member",
    teamName: "My Team",
    inviterName: user?.displayName || user?.email || "Team Admin"
  });

  useEffect(() => {
    if (activeOrg?.name) {
      setInviteForm(prev => ({ ...prev, teamName: activeOrg.name }));
    }
  }, [activeOrg?.name]);

  // Use user ID as organization ID to ensure data isolation
  // Each user has their own team/organization scope
  const getOrganizationId = () => {
    if (!user?.uid) return null;
    
    // Handle different session types:
    // - Password login: integer user ID
    // - Google OAuth: Firebase UID string like "google_123456"
    if (typeof user.uid === 'number') {
      return user.uid;
    }
    
    if (typeof user.uid === 'string') {
      // Try parsing as integer first (for password accounts)
      const parsed = parseInt(user.uid);
      if (!isNaN(parsed)) {
        return parsed;
      }
      
      // For Firebase UIDs like "google_123456", we need to lookup the database user ID
      // Since we can't do async lookups in the component, we'll need a different approach
      // For now, log the issue and return null to prevent API calls with NaN
      console.warn('[Team Management] Cannot resolve organization ID for Firebase UID:', user.uid);
      return null;
    }
    
    return null;
  };
  
  const organizationId = getOrganizationId();

  const { data: teamMembers = [], isLoading, error: teamMembersError } = useQuery<TeamMember[]>({
    queryKey: ["/api/teams", organizationId, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${organizationId}/members`);
      if (!res.ok) {
        throw new Error(`Failed to fetch team members: ${res.status}`);
      }
      return res.json();
    },
    enabled: !!user && !!organizationId,
    retry: 2,
  });

  const { data: pendingInvitations = [], error: pendingInvitationsError } = useQuery<PendingInvitation[]>({
    queryKey: ["/api/teams", organizationId, "pending-invitations"],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${organizationId}/pending-invitations`);
      if (!res.ok) {
        throw new Error(`Failed to fetch pending invitations: ${res.status}`);
      }
      return res.json();
    },
    enabled: !!user,
    retry: 2,
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteTeamMemberForm) => {
      const response = await fetch(`/api/teams/${organizationId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to invite team member");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", organizationId, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", organizationId, "pending-invitations"] });
      setInviteDialogOpen(false);
      setInviteForm({ 
        email: "", 
        role: "member",
        teamName: "My Team",
        inviterName: user?.displayName || user?.email || "Team Admin"
      });
      toast({
        title: "Team member invited",
        description: "The invitation has been sent successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to invite team member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ memberId, updates }: { memberId: number; updates: Partial<TeamMember> }) => {
      const response = await fetch(`/api/teams/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update team member");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", organizationId, "members"] });
      toast({
        title: "Team member updated",
        description: "The team member has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update team member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const response = await fetch(`/api/teams/members/${memberId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to remove team member");
      }
      
      // 204 No Content response doesn't have a body to parse
      return;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", organizationId, "members"] });
      toast({
        title: "Team member removed",
        description: "The team member has been removed from the organization.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove team member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      const response = await fetch(`/api/teams/pending-invitations/${invitationId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to cancel invitation");
      }
      
      // 204 No Content response doesn't have a body to parse
      return;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", organizationId, "pending-invitations"] });
      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to cancel invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      const response = await fetch(`/api/teams/invitations/${invitationId}/resend`, {
        method: "POST",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to resend invitation");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", organizationId, "pending-invitations"] });
      toast({
        title: "Invitation resent",
        description: "The invitation has been sent again successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to resend invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInvite = () => {
    if (!inviteForm.email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }

    inviteMutation.mutate(inviteForm);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">Invite Pending</Badge>;
      case "inactive":
        return <Badge variant="outline" className="bg-gray-100 text-gray-600">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="default" className="bg-purple-100 text-purple-800 border-purple-200">
          <Shield className="w-3 h-3 mr-1" />
          Admin
        </Badge>;
      case "editor":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">Editor</Badge>;
      case "member":
        return <Badge variant="outline">Member</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        {activeOrg && (
          <div className="bg-[#302E87]/5 border-b border-[#302E87]/20 px-6 py-3 flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-[#302E87]" />
            <span className="text-[#302E87] font-medium">{activeOrg.name}</span>
            <span className="text-gray-500">organization</span>
          </div>
        )}
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Management
              </CardTitle>
              <CardDescription>
                Invite team members and manage permissions for your organization
              </CardDescription>
            </div>
            <div className="h-9 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-48 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
      <Card className="max-w-4xl mx-auto border-4 border-[#0A0A0F] rounded-none shadow-[8px_8px_0px_0px_#0A0A0F] bg-white">
      {activeOrg && (
        <div className="bg-[#1976D2] border-b-4 border-[#0A0A0F] px-6 py-3 flex items-center gap-2 text-sm text-white">
          <Building2 className="h-4 w-4 text-[#FFD600]" />
          <span className="font-black uppercase tracking-widest">{activeOrg.name}</span>
          <span className="opacity-80 font-bold uppercase tracking-tight text-xs ml-1">organization</span>
        </div>
      )}
      <CardHeader className="border-b-4 border-[#0A0A0F] bg-white py-8 px-8">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 font-black uppercase tracking-tight text-[#0A0A0F] text-2xl">
              <Users className="w-6 h-6" />
              Team Management
            </CardTitle>
            <CardDescription className="text-gray-600 font-medium text-base mt-2">
              Invite team members and manage permissions for your organization
            </CardDescription>
          </div>
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-[#0A0A0F] border-2 border-[#0A0A0F] rounded-none shadow-[4px_4px_0px_0px_#0A0A0F] hover:bg-[#FFD600] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] font-bold uppercase tracking-wide transition-all px-6 py-6 h-auto">
                <UserPlus className="w-5 h-5 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your team
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={inviteForm.role}
                    onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value }))}
                  >
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
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setInviteDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleInvite}
                    disabled={inviteMutation.isPending}
                  >
                    {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-8">
        {teamMembers.length === 0 && pendingInvitations.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-200">
            <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-black uppercase tracking-tight text-[#0A0A0F] mb-2">No team members yet</h3>
            <p className="text-gray-500 mb-6 font-medium">
              Start collaborating by inviting your team members
            </p>
          </div>
        ) : (
          <div className="border-4 border-[#0A0A0F] rounded-none overflow-hidden shadow-[6px_6px_0px_0px_#0A0A0F]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Access</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 border-2 border-[#0A0A0F] rounded-none flex items-center justify-center shadow-[2px_2px_0px_0px_#0A0A0F]">
                          <Mail className="w-5 h-5 text-[#0A0A0F]" />
                        </div>
                        <div>
                          <div className="font-black uppercase tracking-tight text-base text-[#0A0A0F]">
                            {member.user?.username || member.email}
                          </div>
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">{member.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(member.role)}</TableCell>
                    <TableCell>{getStatusBadge(member.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-3 h-3" />
                        {member.lastAccessAt 
                          ? new Date(member.lastAccessAt).toLocaleDateString()
                          : "Never"
                        }
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {member.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateMemberMutation.mutate({
                                memberId: member.id,
                                updates: { status: "active" }
                              })}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateMemberMutation.mutate({
                                memberId: member.id,
                                updates: { status: "inactive" }
                              })}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                        <Select
                          value={member.role}
                          onValueChange={(value) => updateMemberMutation.mutate({
                            memberId: member.id,
                            updates: { role: value }
                          })}
                        >
                          <SelectTrigger className="w-24 h-8 text-sm">
                            <SelectValue />
                            <ChevronDown className="w-3 h-3" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {member.user?.username || member.email} from the team? 
                                This action cannot be undone and they will lose access to all projects and blueprints.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => deleteMemberMutation.mutate(member.id)}
                              >
                                Remove Member
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {pendingInvitations.map((invitation) => (
                  <TableRow key={`pending-${invitation.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-yellow-50 border-2 border-[#0A0A0F] rounded-none flex items-center justify-center shadow-[2px_2px_0px_0px_#0A0A0F]">
                          <Mail className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                          <div className="font-black uppercase tracking-tight text-base text-[#0A0A0F]">{invitation.email}</div>
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Invitation sent</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(invitation.role)}</TableCell>
                    <TableCell>{getStatusBadge("pending")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-3 h-3" />
                        Invited {new Date(invitation.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resendInviteMutation.mutate(invitation.id)}
                          disabled={resendInviteMutation.isPending}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel the invitation for {invitation.email}? 
                                They will not be able to join the team using this invitation.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => cancelInvitationMutation.mutate(invitation.id)}
                              >
                                Cancel Invitation
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}