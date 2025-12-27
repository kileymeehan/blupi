import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Clock, 
  Check, 
  X, 
  Building2, 
  Mail, 
  RotateCcw
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TeamMember {
  id: number;
  email: string;
  role: string;
  status: string;
  lastAccessAt?: string;
  user?: {
    username: string;
  };
}

interface PendingInvitation {
  id: number;
  email: string;
  role: string;
  createdAt: string;
}

interface Organization {
  id: string;
  name: string;
}

export function TeamManagement() {
  const { toast } = useToast();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "member"
  });

  const { data: activeOrg } = useQuery<Organization | null>({
    queryKey: ['/api/organizations/active'],
  });

  const { data: teamMembers = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ['/api/team/members'],
  });

  const { data: pendingInvitations = [] } = useQuery<PendingInvitation[]>({
    queryKey: ['/api/team/invitations'],
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: typeof inviteForm) => {
      await apiRequest('POST', '/api/team/invite', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team/invitations'] });
      setInviteDialogOpen(false);
      setInviteForm({ email: "", role: "member" });
      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${inviteForm.email}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ memberId, updates }: { memberId: number; updates: any }) => {
      await apiRequest('PATCH', `/api/team/members/${memberId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team/members'] });
      toast({
        title: "Member updated",
        description: "Team member status has been updated.",
      });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      await apiRequest('DELETE', `/api/team/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team/members'] });
      toast({
        title: "Member removed",
        description: "Team member has been removed from the organization.",
      });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      await apiRequest('DELETE', `/api/team/invitations/${invitationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team/invitations'] });
      toast({
        title: "Invitation cancelled",
        description: "The pending invitation has been cancelled.",
      });
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      await apiRequest('POST', `/api/team/invitations/${invitationId}/resend`);
    },
    onSuccess: () => {
      toast({
        title: "Invitation resent",
        description: "The invitation has been resent to the recipient.",
      });
    },
  });

  const handleInvite = () => {
    if (inviteForm.email) {
      inviteMutation.mutate(inviteForm);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      owner: "bg-purple-600 text-white border-2 border-[#0A0A0F]",
      admin: "bg-red-600 text-white border-2 border-[#0A0A0F]",
      editor: "bg-blue-600 text-white border-2 border-[#0A0A0F]",
      member: "bg-[#0A0A0F] text-white border-2 border-[#0A0A0F]"
    };
    return (
      <Badge className={`${colors[role] || "bg-gray-500"} rounded-none font-black uppercase tracking-widest text-[10px] px-2 py-0.5`}>
        {role}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-600 text-white border-2 border-[#0A0A0F]",
      pending: "bg-[#FFD600] text-[#0A0A0F] border-2 border-[#0A0A0F]",
      inactive: "bg-gray-400 text-white border-2 border-[#0A0A0F]"
    };
    return (
      <Badge className={`${colors[status] || "bg-gray-500"} rounded-none font-black uppercase tracking-widest text-[10px] px-2 py-0.5`}>
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className="border-4 border-[#0A0A0F] rounded-none shadow-[8px_8px_0px_0px_#0A0A0F] bg-white overflow-hidden">
        {activeOrg && (
          <div className="bg-[#1976D2] border-b-4 border-[#0A0A0F] px-6 py-3 flex items-center gap-2 text-sm text-white font-bold uppercase tracking-wide">
            <Building2 className="h-4 w-4" />
            <span>{activeOrg.name}</span>
            <span className="opacity-80">workspace</span>
          </div>
        )}
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-2 text-[#0A0A0F]">
                <Users className="h-6 w-6" />
                Team Management
              </CardTitle>
              <CardDescription className="text-gray-600 font-medium">
                Invite team members and manage permissions for your organization
              </CardDescription>
            </div>
            <div className="h-10 w-32 bg-gray-200 border-2 border-[#0A0A0F] animate-pulse rounded-none" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border-2 border-[#0A0A0F] flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-10 w-10 bg-gray-200 border-2 border-[#0A0A0F] animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-gray-200 animate-pulse" />
                    <div className="h-3 w-48 bg-gray-100 animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-16 bg-gray-200 animate-pulse" />
                  <div className="h-8 w-24 bg-gray-200 border-2 border-[#0A0A0F] animate-pulse" />
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
      {activeOrg && (
        <div className="bg-[#1976D2] border-b-4 border-[#0A0A0F] px-6 py-3 flex items-center gap-2 text-sm text-white font-bold uppercase tracking-wide">
          <Building2 className="h-4 w-4" />
          <span>{activeOrg.name}</span>
          <span className="opacity-80">workspace</span>
        </div>
      )}
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-2 text-[#0A0A0F]">
              <Users className="h-6 w-6" />
              Team Management
            </CardTitle>
            <CardDescription className="text-gray-600 font-medium">
              Invite team members and manage permissions for your organization
            </CardDescription>
          </div>
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-[#0A0A0F] border-2 border-[#0A0A0F] rounded-none shadow-[2px_2px_0px_0px_#FFD600] hover:bg-[#FFD600] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] font-bold uppercase tracking-wide transition-all">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent className="border-2 border-[#0A0A0F] rounded-none shadow-[8px_8px_0px_0px_#0A0A0F]">
              <DialogHeader className="border-b-2 border-[#0A0A0F] pb-4">
                <DialogTitle className="text-[#0A0A0F] font-black uppercase tracking-tight">Invite Team Member</DialogTitle>
                <DialogDescription className="text-gray-600">
                  Send an invitation to join your team
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-bold uppercase tracking-wide text-xs text-[#0A0A0F]">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                    className="border-2 border-[#0A0A0F] rounded-none focus:ring-[#FFD600]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="font-bold uppercase tracking-wide text-xs text-[#0A0A0F]">Role</Label>
                  <Select
                    value={inviteForm.role}
                    onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger className="border-2 border-[#0A0A0F] rounded-none shadow-[2px_2px_0px_0px_#FFD600] font-bold uppercase tracking-wide">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-2 border-[#0A0A0F] rounded-none shadow-[4px_4px_0px_0px_#0A0A0F]">
                      <SelectItem value="member" className="rounded-none hover:bg-[#FFD600] font-bold uppercase tracking-wide">Member</SelectItem>
                      <SelectItem value="editor" className="rounded-none hover:bg-[#FFD600] font-bold uppercase tracking-wide">Editor</SelectItem>
                      <SelectItem value="admin" className="rounded-none hover:bg-[#FFD600] font-bold uppercase tracking-wide">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="ghost"
                    onClick={() => setInviteDialogOpen(false)}
                    className="rounded-none border-2 border-transparent hover:border-[#0A0A0F] font-bold uppercase tracking-wide"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleInvite}
                    disabled={inviteMutation.isPending}
                    className="bg-[#0A0A0F] text-white border-2 border-[#0A0A0F] rounded-none shadow-[2px_2px_0px_0px_#FFD600] hover:bg-[#FFD600] hover:text-[#0A0A0F] hover:shadow-none font-bold uppercase tracking-wide transition-all"
                  >
                    {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {teamMembers.length === 0 && pendingInvitations.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-[#0A0A0F] rounded-none bg-gray-50">
            <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-black uppercase tracking-tight text-[#0A0A0F] mb-2">No team members yet</h3>
            <p className="text-gray-500 mb-6 font-medium">
              Start collaborating by inviting your team members
            </p>
          </div>
        ) : (
          <div className="border-2 border-[#0A0A0F] rounded-none overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-100 border-b-2 border-[#0A0A0F]">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-black uppercase tracking-wider text-[#0A0A0F] text-xs">Member</TableHead>
                  <TableHead className="font-black uppercase tracking-wider text-[#0A0A0F] text-xs">Role</TableHead>
                  <TableHead className="font-black uppercase tracking-wider text-[#0A0A0F] text-xs">Status</TableHead>
                  <TableHead className="font-black uppercase tracking-wider text-[#0A0A0F] text-xs">Last Access</TableHead>
                  <TableHead className="font-black uppercase tracking-wider text-[#0A0A0F] text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id} className="border-b-2 border-[#0A0A0F] last:border-0 hover:bg-[#FFD600]/10">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#0A0A0F] text-white rounded-none flex items-center justify-center border-2 border-[#0A0A0F]">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-[#0A0A0F] uppercase tracking-tight text-sm">
                            {member.user?.username || member.email}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">{member.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(member.role)}</TableCell>
                    <TableCell>{getStatusBadge(member.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-gray-500 font-bold uppercase tracking-wide">
                        <Clock className="w-3 h-3" />
                        {member.lastAccessAt 
                          ? new Date(member.lastAccessAt).toLocaleDateString()
                          : "Never"
                        }
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Select
                          value={member.role}
                          onValueChange={(value) => updateMemberMutation.mutate({
                            memberId: member.id,
                            updates: { role: value }
                          })}
                        >
                          <SelectTrigger className="w-24 h-8 text-xs border-2 border-[#0A0A0F] rounded-none font-bold uppercase tracking-wide">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-2 border-[#0A0A0F] rounded-none shadow-[4px_4px_0px_0px_#0A0A0F]">
                            <SelectItem value="member" className="rounded-none hover:bg-[#FFD600] font-bold uppercase tracking-wide">Member</SelectItem>
                            <SelectItem value="editor" className="rounded-none hover:bg-[#FFD600] font-bold uppercase tracking-wide">Editor</SelectItem>
                            <SelectItem value="admin" className="rounded-none hover:bg-[#FFD600] font-bold uppercase tracking-wide">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600 hover:text-white hover:bg-red-600 rounded-none border-2 border-transparent hover:border-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="border-2 border-[#0A0A0F] rounded-none shadow-[8px_8px_0px_0px_#0A0A0F]">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-black uppercase tracking-tight text-[#0A0A0F]">Remove Team Member</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {member.user?.username || member.email} from the team? 
                                This action cannot be undone and they will lose access to all projects and blueprints.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-none border-2 border-[#0A0A0F] font-bold uppercase tracking-wide hover:bg-gray-100">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700 rounded-none border-2 border-red-600 font-bold uppercase tracking-wide"
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
                  <TableRow key={`pending-${invitation.id}`} className="border-b-2 border-[#0A0A0F] last:border-0 bg-[#FFD600]/5 hover:bg-[#FFD600]/10">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#FFD600] text-[#0A0A0F] rounded-none flex items-center justify-center border-2 border-[#0A0A0F]">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-[#0A0A0F] uppercase tracking-tight text-sm">{invitation.email}</div>
                          <div className="text-xs text-gray-500 font-medium">Invitation sent</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(invitation.role)}</TableCell>
                    <TableCell>{getStatusBadge("pending")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-gray-500 font-bold uppercase tracking-wide">
                        <Clock className="w-3 h-3" />
                        Invited {new Date(invitation.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => resendInviteMutation.mutate(invitation.id)}
                          disabled={resendInviteMutation.isPending}
                          className="h-8 w-8 p-0 text-[#1976D2] hover:text-white hover:bg-[#1976D2] rounded-none border-2 border-transparent hover:border-[#1976D2]"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600 hover:text-white hover:bg-red-600 rounded-none border-2 border-transparent hover:border-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="border-2 border-[#0A0A0F] rounded-none shadow-[8px_8px_0px_0px_#0A0A0F]">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-black uppercase tracking-tight text-[#0A0A0F]">Cancel Invitation</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel the invitation for {invitation.email}? 
                                They will not be able to join the team using this invitation.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-none border-2 border-[#0A0A0F] font-bold uppercase tracking-wide hover:bg-gray-100">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700 rounded-none border-2 border-red-600 font-bold uppercase tracking-wide"
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
