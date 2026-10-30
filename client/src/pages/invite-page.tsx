import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-simple-auth";

type Invite =
  | { status: "accepted" | "expired" | "revoked" }
  | {
      status: "pending";
      email: string;
      workspaceName: string;
      inviterName: string;
      role: string;
      projectName: string | null;
      accountExists: boolean;
      signedInEmail: string | null;
    };

const ENDED: Record<string, { title: string; body: string }> = {
  accepted: { title: "This invitation has been used", body: "If it was yours, sign in to continue." },
  expired: { title: "This invitation has expired", body: "Ask the person who invited you to send a new link." },
  revoked: { title: "This invitation was cancelled", body: "Ask the person who invited you for a new link if you still need access." },
  invalid: { title: "This invitation link isn't valid", body: "Check you copied the whole link, or ask for a new one." },
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ds-page px-4 py-12">
      <div className="w-full max-w-md">
        <img src="/Blupi-logomark-blue.png" alt="Blupi" className="mx-auto mb-8 h-10 w-auto" />
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">{children}</div>
      </div>
    </div>
  );
}

export default function InvitePage() {
  const { token } = useParams();
  const { user, signIn, signUp, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: invite, isLoading, isError, refetch } = useQuery<Invite>({
    queryKey: ["/api/invite", token, user?.email ?? null],
    queryFn: async () => {
      const res = await fetch(`/api/invite/${token}`, { credentials: "include" });
      if (!res.ok) throw new Error("invalid");
      return res.json();
    },
    retry: false,
  });

  const accept = async () => {
    const res = await fetch(`/api/invite/${token}/accept`, { method: "POST", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Couldn't accept the invitation");
    // Full reload so every screen picks up the newly joined workspace
    window.location.href = data.redirect || "/";
  };

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setWorking(true);
    try {
      await fn();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setWorking(false);
    }
  };

  if (isLoading) {
    return (
      <Shell>
        <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      </Shell>
    );
  }

  if (isError || !invite || invite.status !== "pending") {
    const ended = ENDED[invite?.status ?? "invalid"];
    return (
      <Shell>
        <h1 className="text-xl font-semibold text-ds-ink">{ended.title}</h1>
        <p className="mt-2 text-sm text-gray-600">{ended.body}</p>
        <Button asChild className="mt-6 w-full bg-ds-accent hover:bg-ds-ink text-white">
          <Link href={user ? "/" : "/auth/login"}>{user ? "Go to Blupi" : "Sign in"}</Link>
        </Button>
      </Shell>
    );
  }

  const target = invite.projectName ? (
    <>the project <strong>{invite.projectName}</strong> in <strong>{invite.workspaceName}</strong></>
  ) : (
    <strong>{invite.workspaceName}</strong>
  );
  const signedIn = !!user;
  const emailMatches = signedIn && user!.email?.toLowerCase() === invite.email.toLowerCase();
  const googleHref = `/api/auth/google?next=${encodeURIComponent(`/invite/${token}`)}`;

  return (
    <Shell>
      <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Invitation</p>
      <h1 className="mt-2 text-xl font-semibold leading-snug text-ds-ink">
        {invite.inviterName} invited you to join {target}
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        You'll join as {invite.role === "admin" ? "an admin" : "a member"}. This invitation is for <strong>{invite.email}</strong>.
      </p>

      <div className="mt-6 space-y-3">
        {signedIn && emailMatches && (
          <Button
            className="w-full bg-ds-accent hover:bg-ds-ink text-white"
            disabled={working}
            onClick={() => run(accept)}
          >
            {working ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Join {invite.workspaceName}
          </Button>
        )}

        {signedIn && !emailMatches && (
          <>
            <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">
              You're signed in as <strong>{user!.email}</strong>. Sign in as {invite.email} to accept.
            </p>
            <Button
              variant="outline"
              className="w-full"
              disabled={working}
              onClick={() => run(async () => { await signOut(); setWorking(false); refetch(); })}
            >
              Sign out and continue
            </Button>
          </>
        )}

        {!signedIn && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                if (invite.accountExists) await signIn(invite.email, password);
                else await signUp(invite.email, password);
                await accept();
              });
            }}
          >
            <Input value={invite.email} disabled aria-label="Email" />
            <Input
              type="password"
              autoComplete={invite.accountExists ? "current-password" : "new-password"}
              placeholder={invite.accountExists ? "Your password" : "Choose a password (8+ characters)"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={working}
              aria-label="Password"
              autoFocus
            />
            <Button
              type="submit"
              className="w-full bg-ds-accent hover:bg-ds-ink text-white"
              disabled={working || password.length < (invite.accountExists ? 1 : 8)}
            >
              {working ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {invite.accountExists ? "Sign in and join" : "Create account and join"}
            </Button>
            <div className="flex items-center gap-3 py-1 text-xs text-gray-400">
              <span className="h-px flex-1 bg-gray-200" />or<span className="h-px flex-1 bg-gray-200" />
            </div>
            <Button asChild variant="outline" className="w-full">
              <a href={googleHref}>Continue with Google</a>
            </Button>
          </form>
        )}

        {error && <p className="text-sm text-ds-danger" role="alert">{error}</p>}
      </div>
    </Shell>
  );
}
