import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  Clock, 
  Check, 
  X, 
  RotateCcw, 
  Trash2,
  ChevronDown,
  Plus
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
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
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TeamMember, Invitation } from "@shared/schema";

export function TeamManagement() {
  const { toast } = useToast();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "member" as const
  });

  const { data: teamMembers = [], isLoading } = useQuery<(TeamMember & { user?: { username: string } })[]>({
    queryKey: ["/api/team-members"],
  });

  const { data: pendingInvitations = [] } = useQuery<Invitation[]>({
    queryKey: ["/api/invitations/pending"],
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: typeof inviteForm) => {
      const res = await apiRequest("POST", "/api/invitations", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations/pending"] });
      setInviteDialogOpen(false);
      setInviteForm({ email: "", role: "member" });
      toast({
        title: "Invitation Sent",
        description: `We've sent an invitation to ${inviteForm.email}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ memberId, updates }: { memberId: number, updates: Partial<TeamMember> }) => {
      const res = await apiRequest("PATCH", `/api/team-members/${memberId}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({
        title: "Member Updated",
        description: "Team member details have been successfully updated.",
      });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      await apiRequest("DELETE", `/api/team-members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({
        title: "Member Removed",
        description: "The team member has been removed from your organization.",
      });
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      const res = await apiRequest("POST", `/api/invitations/${invitationId}/resend`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation Resent",
        description: "The invitation email has been sent again.",
      });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      await apiRequest("DELETE", `/api/invitations/${invitationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations/pending"] });
      toast({
        title: "Invitation Cancelled",
        description: "The invitation has been successfully cancelled.",
      });
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email) {
      toast({
        title: "Missing Email",
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
        return <Badge variant="default" className="bg-[#00E676] text-[#0A0A0F] border-2 border-[#0A0A0F] rounded-none font-black uppercase text-[10px] tracking-widest shadow-[2px_2px_0px_0px_#0A0A0F]">Active</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-[#FFD600] text-[#0A0A0F] border-2 border-[#0A0A0F] rounded-none font-black uppercase text-[10px] tracking-widest shadow-[2px_2px_0px_0px_#0A0A0F]">Pending</Badge>;
      case "inactive":
        return <Badge variant="outline" className="bg-white text-[#0A0A0F]/40 border-2 border-[#0A0A0F]/20 rounded-none font-black uppercase text-[10px] tracking-widest">Inactive</Badge>;
      default:
        return <Badge variant="outline" className="border-2 border-[#0A0A0F] rounded-none font-black uppercase text-[10px] tracking-widest">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="default" className="bg-[#1976D2] text-white border-2 border-[#0A0A0F] rounded-none font-black uppercase text-[10px] tracking-widest shadow-[2px_2px_0px_0px_#0A0A0F]">
          <Shield className="w-3 h-3 mr-1" />
          Admin
        </Badge>;
      case "editor":
        return <Badge variant="secondary" className="bg-[#FFD600] text-[#0A0A0F] border-2 border-[#0A0A0F] rounded-none font-black uppercase text-[10px] tracking-widest shadow-[2px_2px_0px_0px_#0A0A0F]">Editor</Badge>;
      case "member":
        return <Badge variant="outline" className="bg-white text-[#0A0A0F] border-2 border-[#0A0A0F] rounded-none font-black uppercase text-[10px] tracking-widest shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">Member</Badge>;
      default:
        return <Badge variant="outline" className="border-2 border-[#0A0A0F] rounded-none font-black uppercase text-[10px] tracking-widest">{role}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-[#0A0A0F] rounded-none shadow-[8px_8px_0px_0px_#0A0A0F]">
        <CardHeader className="bg-[#0A0A0F] text-white py-6">
          <CardTitle className="text-2xl font-black uppercase tracking-tight">Team Management</CardTitle>
          <CardDescription className="text-gray-400">Loading members...</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <div className="animate-pulse space-y-4 w-full px-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-100 border-2 border-gray-200 rounded-none" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-[#0A0A0F] rounded-none shadow-[8px_8px_0px_0px_#0A0A0F] overflow-hidden">
      <CardHeader className="bg-[#0A0A0F] text-white py-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
              <Users className="w-6 h-6 text-[#FFD600]" />
              Team Management
            </CardTitle>
            <CardDescription className="text-gray-400 mt-1">
              Invite team members and manage permissions for your organization
            </CardDescription>
          </div>
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-[#0A0A0F] border-2 border-[#0A0A0F] rounded-none shadow-[4px_4px_0px_0px_#FFD600] hover:bg-[#FFD600] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] font-black uppercase tracking-wide transition-all">
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent className="border-4 border-[#0A0A0F] rounded-none shadow-[12px_12px_0px_0px_#0A0A0F]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight">Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your organization.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-black uppercase text-xs tracking-widest">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                    className="border-2 border-[#0A0A0F] rounded-none focus:ring-[#FFD600]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="font-black uppercase text-xs tracking-widest">Role</Label>
                  <Select
                    value={inviteForm.role}
                    onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value as any }))}
                  >
                    <SelectTrigger className="border-2 border-[#0A0A0F] rounded-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setInviteDialogOpen(false)}
                    className="border-2 border-[#0A0A0F] rounded-none font-black uppercase tracking-wide"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleInvite}
                    disabled={inviteMutation.isPending}
                    className="bg-[#0A0A0F] text-white border-2 border-[#0A0A0F] rounded-none font-black uppercase tracking-wide hover:bg-[#FFD600] hover:text-[#0A0A0F]"
                  >
                    {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {teamMembers.length === 0 && pendingInvitations.length === 0 ? (
          <div className="text-center py-12 p-6">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-black uppercase tracking-tight text-[#0A0A0F] mb-2">No team members yet</h3>
            <p className="text-gray-600 mb-6 font-medium">
              Start collaborating by inviting your team members
            </p>
          </div>
        ) : (
          <div className="p-6">
            <Table className="border-collapse">
              <TableHeader>
                <TableRow className="border-b-4 border-[#0A0A0F] hover:bg-transparent">
                  <TableHead className="py-4 font-black uppercase text-xs tracking-widest text-[#0A0A0F]">Member</TableHead>
                  <TableHead className="py-4 font-black uppercase text-xs tracking-widest text-[#0A0A0F]">Role</TableHead>
                  <TableHead className="py-4 font-black uppercase text-xs tracking-widest text-[#0A0A0F]">Status</TableHead>
                  <TableHead className="py-4 font-black uppercase text-xs tracking-widest text-[#0A0A0F]">Last Access</TableHead>
                  <TableHead className="py-4 text-right font-black uppercase text-xs tracking-widest text-[#0A0A0F]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.id} className="border-b-2 border-[#0A0A0F]/10 hover:bg-[#FFD600]/5 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white border-2 border-[#0A0A0F] flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
                          <Mail className="w-5 h-5 text-[#0A0A0F]" />
                        </div>
                        <div>
                          <div className="font-black uppercase tracking-tight text-sm">
                            {member.user?.username || member.email}
                          </div>
                          <div className="text-xs font-medium text-[#0A0A0F]/60 tracking-wide">{member.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">{getRoleBadge(member.role)}</TableCell>
                    <TableCell className="py-4">{getStatusBadge(member.status)}</TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#0A0A0F]/60">
                        <Clock className="w-3 h-3" />
                        {member.lastAccessAt 
                          ? new Date(member.lastAccessAt).toLocaleDateString()
                          : "Never"
                        }
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                      {member.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateMemberMutation.mutate({
                              memberId: member.id,
                              updates: { status: "active" }
                            })}
                            className="w-8 h-8 p-0 border-2 border-[#0A0A0F] rounded-none hover:bg-[#00E676]"
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
                            className="w-8 h-8 p-0 border-2 border-[#0A0A0F] rounded-none hover:bg-red-500 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      <Select
                        value={member.role}
                        onValueChange={(value) => updateMemberMutation.mutate({
                          memberId: member.id,
                          updates: { role: value as any }
                        })}
                      >
                        <SelectTrigger className="w-28 h-9 text-xs font-black uppercase border-2 border-[#0A0A0F] rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-2 border-[#0A0A0F] rounded-none">
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
                            className="w-9 h-9 p-0 border-2 border-[#0A0A0F] rounded-none text-red-600 hover:bg-red-600 hover:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="border-4 border-[#0A0A0F] rounded-none shadow-[12px_12px_0px_0px_#0A0A0F]">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-2xl font-black uppercase">Remove Team Member</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-600 font-medium">
                              Are you sure you want to remove {member.user?.username || member.email} from the team? 
                              This action cannot be undone and they will lose access to all projects and blueprints.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="pt-4">
                            <AlertDialogCancel className="border-2 border-[#0A0A0F] rounded-none font-black uppercase">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700 text-white border-2 border-red-600 rounded-none font-black uppercase"
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
                  <TableRow key={`pending-${invitation.id}`} className="border-b-2 border-[#0A0A0F]/10 bg-yellow-50/30">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white border-2 border-[#FFD600] flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]">
                          <Mail className="w-5 h-5 text-[#FFD600]" />
                        </div>
                        <div>
                          <div className="font-black uppercase tracking-tight text-sm">{invitation.email}</div>
                          <div className="text-xs font-black uppercase tracking-widest text-[#FFD600]">Invitation sent</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">{getRoleBadge(invitation.role)}</TableCell>
                    <TableCell className="py-4">{getStatusBadge("pending")}</TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#0A0A0F]/60">
                        <Clock className="w-3 h-3" />
                        Invited {new Date(invitation.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resendInviteMutation.mutate(invitation.id)}
                          disabled={resendInviteMutation.isPending}
                          className="w-9 h-9 p-0 border-2 border-[#0A0A0F] rounded-none text-[#1976D2] hover:bg-[#1976D2] hover:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] transition-all"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-9 h-9 p-0 border-2 border-[#0A0A0F] rounded-none text-red-600 hover:bg-red-600 hover:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="border-4 border-[#0A0A0F] rounded-none shadow-[12px_12px_0px_0px_#0A0A0F]">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-2xl font-black uppercase">Cancel Invitation</AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-600 font-medium">
                                Are you sure you want to cancel the invitation for {invitation.email}? 
                                They will not be able to join the team using this invitation.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="pt-4">
                              <AlertDialogCancel className="border-2 border-[#0A0A0F] rounded-none font-black uppercase">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700 text-white border-2 border-red-600 rounded-none font-black uppercase"
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
