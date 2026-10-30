import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Copy, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";

type Result =
  | { type: "invited"; url: string; emailSent: boolean; emailConfigured: boolean }
  | { type: "added"; alreadyOnProject: boolean };

export function CopyLinkButton({ url, className = "" }: { url: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="mr-1.5 h-4 w-4 text-green-600" /> : <Copy className="mr-1.5 h-4 w-4" />}
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}

// Invite someone to the workspace, or (with projectId) to the workspace and that project
export function InvitePeopleDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: number;
  projectName?: string;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [projectRole, setProjectRole] = useState("editor");
  const [result, setResult] = useState<Result | null>(null);

  const invite = useMutation({
    mutationFn: async (): Promise<Result> => {
      const res = await fetch("/api/invitations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, projectId, projectRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Couldn't create the invitation");
      return data;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
      if (projectId) queryClient.invalidateQueries({ queryKey: ["/api/projects", String(projectId), "members"] });
    },
  });

  const reset = () => {
    setEmail("");
    setRole("member");
    setProjectRole("editor");
    setResult(null);
    invite.reset();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#302E87] text-xl font-semibold">
            {projectName ? `Invite to ${projectName}` : "Invite people"}
          </DialogTitle>
          <DialogDescription className="text-[#6B6B97]">
            {projectName
              ? "They'll join the workspace and this project."
              : "They'll join this workspace and can be added to its projects."}
          </DialogDescription>
        </DialogHeader>

        {result?.type === "added" ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              {result.alreadyOnProject
                ? `${email} is already on this project.`
                : `${email} is already in the workspace, so they've been added to the project directly.`}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Invite someone else</Button>
              <Button className="bg-[#302E87] hover:bg-[#252270] text-white" onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        ) : result?.type === "invited" ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              {result.emailSent
                ? <>We emailed an invitation to <strong>{email}</strong>. You can also share the link yourself:</>
                : <>Send this link to <strong>{email}</strong>. It works once and expires in 7 days.</>}
            </p>
            <div className="flex gap-2">
              <Input readOnly value={result.url} onFocus={(e) => e.target.select()} className="font-mono text-xs" aria-label="Invitation link" />
              <CopyLinkButton url={result.url} className="flex-shrink-0" />
            </div>
            {!result.emailConfigured && (
              <p className="text-xs text-gray-500">Invitation emails aren't set up yet, so share the link by Slack, email or text.</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Invite someone else</Button>
              <Button className="bg-[#302E87] hover:bg-[#252270] text-white" onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              invite.mutate();
            }}
          >
            <div className="space-y-1.5">
              <label htmlFor="invite-email" className="text-sm font-medium text-[#302E87]">Email</label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                autoFocus
                required
              />
            </div>
            <div className={`grid gap-3 ${projectId ? "grid-cols-2" : "grid-cols-1"}`}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#302E87]">Workspace role</label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin (can invite people)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {projectId && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#302E87]">Project role</label>
                  <Select value={projectRole} onValueChange={setProjectRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {invite.error && <p className="text-sm text-[#E53935]" role="alert">{(invite.error as Error).message}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={invite.isPending || !email} className="bg-[#302E87] hover:bg-[#252270] text-white">
                {invite.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create invite
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
