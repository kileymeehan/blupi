import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { MoreVertical, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { InvitePeopleDialog, CopyLinkButton } from "./invite-dialog";

type Member = { userId: number; name: string; email: string; role: string; joinedAt: string; isYou: boolean };
type Invitation = {
  id: number;
  email: string;
  role: string;
  projectName: string | null;
  expiresAt: string;
  status: "pending" | "expired";
  url: string;
};

const ROLE_LABEL: Record<string, string> = { owner: "Owner", admin: "Admin", member: "Member" };
const th = "pb-2 text-[11px] font-bold uppercase tracking-widest text-gray-500";

async function send(method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
}

export default function TeamManagement() {
  const { toast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: activeOrg } = useQuery<{ name: string }>({ queryKey: ["/api/organizations/active"] });
  const { data, isLoading } = useQuery<{ members: Member[]; myRole: string }>({
    queryKey: ["/api/workspace/members"],
    queryFn: () => send("GET", "/api/workspace/members"),
  });
  const members = data?.members ?? [];
  const canManage = data?.myRole === "owner" || data?.myRole === "admin";

  const { data: invitations = [] } = useQuery<Invitation[]>({
    queryKey: ["/api/invitations"],
    queryFn: () => send("GET", "/api/invitations"),
    enabled: canManage,
  });

  const onError = (error: Error) => toast({ title: "Couldn't do that", description: error.message, variant: "destructive" });
  const refreshMembers = () => queryClient.invalidateQueries({ queryKey: ["/api/workspace/members"] });
  const refreshInvites = () => queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });

  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) => send("PATCH", `/api/workspace/members/${userId}`, { role }),
    onSuccess: refreshMembers,
    onError,
  });
  const removeMember = useMutation({
    mutationFn: (m: Member) => send("DELETE", `/api/workspace/members/${m.userId}`),
    onSuccess: (_d, m) => {
      // Leaving the workspace: reload into whichever workspace is now active
      if (m.isYou) window.location.href = "/";
      else refreshMembers();
    },
    onError,
  });
  const revoke = useMutation({
    mutationFn: (id: number) => send("DELETE", `/api/invitations/${id}`),
    onSuccess: refreshInvites,
    onError,
  });
  const renew = useMutation({
    mutationFn: (id: number) => send("POST", `/api/invitations/${id}/renew`),
    onSuccess: async (data: { url: string }) => {
      refreshInvites();
      await navigator.clipboard.writeText(data.url).catch(() => {});
      toast({ title: "New link copied", description: "The old link no longer works. This one lasts 7 days." });
    },
    onError,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="bauhaus-card p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black uppercase tracking-widest text-[#0A0A0F]">Team</h2>
            <p className="mt-1 text-sm text-gray-500">
              {members.length} {members.length === 1 ? "person" : "people"} in {activeOrg?.name ?? "this workspace"}
            </p>
          </div>
          {canManage && (
            <Button onClick={() => setInviteOpen(true)} className="bauhaus-btn h-10 px-5">
              <UserPlus className="mr-1.5 h-4 w-4" />
              Invite people
            </Button>
          )}
        </div>

        {isLoading ? (
          <p className="py-4 text-sm text-gray-500">Loading…</p>
        ) : (
          <table className="w-full table-fixed text-left">
            <thead>
              <tr className="border-b border-gray-200">
                <th className={`${th} pl-1`}>Name</th>
                <th className={`${th} w-[150px]`}>Role</th>
                <th className={`${th} hidden w-[130px] md:table-cell`}>Joined</th>
                <th className={`${th} w-[44px]`}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const editable = canManage && !m.isYou && m.role !== "owner";
                const removable = (canManage && !m.isYou && m.role !== "owner") || (m.isYou && m.role !== "owner");
                return (
                  <tr key={m.userId} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 pl-1 pr-4">
                      <div className="truncate text-sm font-bold text-[#0A0A0F]">
                        {m.name}{m.isYou && <span className="ml-1.5 font-normal text-gray-400">(you)</span>}
                      </div>
                      <div className="truncate text-xs text-gray-500">{m.email}</div>
                    </td>
                    <td className="py-3">
                      {editable ? (
                        <Select value={m.role} onValueChange={(role) => changeRole.mutate({ userId: m.userId, role })}>
                          <SelectTrigger className="h-7 w-auto gap-1 border-0 px-2 text-sm shadow-none hover:bg-black/5 focus:ring-0 focus:ring-offset-0 [&>svg]:h-3 [&>svg]:w-3">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="px-2 text-sm text-gray-600">{ROLE_LABEL[m.role] ?? m.role}</span>
                      )}
                    </td>
                    <td className="hidden py-3 text-sm text-gray-500 md:table-cell">
                      {formatDistanceToNowStrict(new Date(m.joinedAt), { addSuffix: true })}
                    </td>
                    <td className="py-3 text-right">
                      {removable && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-[#0A0A0F] hover:bg-black/5" aria-label={`Actions for ${m.name}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                const msg = m.isYou
                                  ? `Leave ${activeOrg?.name ?? "this workspace"}? You'll lose access to its projects and blueprints.`
                                  : `Remove ${m.name} from the workspace? They'll lose access to its projects and blueprints.`;
                                if (confirm(msg)) removeMember.mutate(m);
                              }}
                            >
                              {m.isYou ? "Leave workspace" : "Remove from workspace"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {canManage && invitations.length > 0 && (
        <section className="bauhaus-card p-6">
          <h2 className="mb-1 text-base font-black uppercase tracking-widest text-[#0A0A0F]">Pending invitations</h2>
          <p className="mb-4 text-sm text-gray-500">Links work once. Copy one to send it again.</p>
          <table className="w-full table-fixed text-left">
            <thead>
              <tr className="border-b border-gray-200">
                <th className={`${th} pl-1`}>Email</th>
                <th className={`${th} hidden w-[140px] md:table-cell`}>Expires</th>
                <th className={`${th} w-[230px]`}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 pl-1 pr-4">
                    <div className="truncate text-sm text-[#0A0A0F]">{inv.email}</div>
                    <div className="truncate text-xs text-gray-500">
                      {ROLE_LABEL[inv.role] ?? inv.role}{inv.projectName ? ` · Project: ${inv.projectName}` : ""}
                    </div>
                  </td>
                  <td className="hidden py-3 text-sm md:table-cell">
                    {inv.status === "expired"
                      ? <span className="text-amber-700">Expired</span>
                      : <span className="text-gray-500">{formatDistanceToNowStrict(new Date(inv.expiresAt), { addSuffix: true })}</span>}
                  </td>
                  <td className="py-3">
                    <div className="flex justify-end gap-1.5">
                      {inv.status === "expired" ? (
                        <Button variant="outline" className="h-8 text-xs" disabled={renew.isPending} onClick={() => renew.mutate(inv.id)}>
                          Renew &amp; copy
                        </Button>
                      ) : (
                        <CopyLinkButton url={inv.url} className="h-8 text-xs" />
                      )}
                      <Button
                        variant="ghost"
                        className="h-8 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50"
                        disabled={revoke.isPending}
                        onClick={() => confirm(`Cancel the invitation for ${inv.email}? The link will stop working.`) && revoke.mutate(inv.id)}
                      >
                        Revoke
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <InvitePeopleDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
