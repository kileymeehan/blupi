import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Chrome, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ExtensionToken = {
  id: number;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
};

const TOKENS_KEY = ["/api/extension/tokens"];

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Never";
}

// Connect the Blupi Chrome extension by creating a token to paste into it
export function ExtensionSettings() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: tokens = [], isLoading } = useQuery<ExtensionToken[]>({
    queryKey: TOKENS_KEY,
    queryFn: async () => (await apiRequest("GET", "/api/extension/tokens")).json(),
  });

  const createToken = useMutation({
    mutationFn: async () =>
      (await apiRequest("POST", "/api/extension/tokens", { name: name.trim() || "Chrome extension" })).json(),
    onSuccess: (data: ExtensionToken & { token: string }) => {
      setNewToken(data.token);
      setCopied(false);
      setName("");
      queryClient.invalidateQueries({ queryKey: TOKENS_KEY });
    },
    onError: () => toast({ title: "Couldn't create token", variant: "destructive" }),
  });

  const revokeToken = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/extension/tokens/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TOKENS_KEY }),
    onError: () => toast({ title: "Couldn't revoke token", variant: "destructive" }),
  });

  const copyToken = async () => {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
    setCopied(true);
  };

  return (
    <div className="rounded bg-white border-2 border-[color:var(--card-border)] shadow-[4px_4px_0px_0px_var(--card-shadow)] p-6 space-y-6">
      <div>
        <h2 className="text-xl font-black uppercase tracking-tight text-ds-ink flex items-center gap-2">
          <Chrome className="h-5 w-5" />
          Chrome extension
        </h2>
        <p className="text-sm text-gray-600 mt-1 max-w-2xl">
          The Blupi extension captures the steps of a flow on any website and turns them into a new board.
          Create a token, then paste it into the extension along with this site's address:{" "}
          <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">{window.location.origin}</code>
        </p>
      </div>

      <form
        className="flex gap-2 max-w-xl"
        onSubmit={(e) => {
          e.preventDefault();
          createToken.mutate();
        }}
      >
        <Input
          placeholder="Token name, e.g. Work laptop"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="bg-white border-[color:var(--card-border)]"
        />
        <Button type="submit" variant="outline" disabled={createToken.isPending} className="shrink-0">
          {createToken.isPending ? "Creating..." : "Create token"}
        </Button>
      </form>

      {newToken && (
        <div className="rounded border-2 border-ds-success bg-[color-mix(in_srgb,var(--ds-success)_10%,transparent)] p-4 space-y-2 max-w-xl">
          <p className="text-sm font-bold text-ds-ink">Copy this token now. It won't be shown again.</p>
          <div className="flex gap-2">
            <code className="flex-1 min-w-0 truncate rounded bg-white border border-gray-300 px-2 py-1.5 text-xs">
              {newToken}
            </code>
            <Button type="button" size="sm" variant="outline" onClick={copyToken} className="shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Active tokens</h3>
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : tokens.length === 0 ? (
          <p className="text-sm text-gray-500">No tokens yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200 border-y border-gray-200 max-w-xl">
            {tokens.map((token) => (
              <li key={token.id} className="flex items-center justify-between py-2.5 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ds-ink truncate">{token.name}</p>
                  <p className="text-xs text-gray-500">
                    Created {formatDate(token.createdAt)} · Last used {formatDate(token.lastUsedAt)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => revokeToken.mutate(token.id)}
                  disabled={revokeToken.isPending}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
