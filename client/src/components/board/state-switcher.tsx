import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ChevronDown, GitCompareArrows, Loader2, Plus, Sparkles, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { Board } from "@shared/schema";

type LinkedBoard = { id: number; name: string; state: string; updatedAt: string };
type Linked = { current: LinkedBoard | null; futures: LinkedBoard[] };

const segment = (active: boolean) =>
  `h-8 px-3 text-xs font-bold uppercase tracking-wider rounded-sm transition-colors ${
    active ? "bg-ds-pop text-ds-ink" : "text-white/80 hover:text-white hover:bg-white/10"
  }`;

// Header control for moving between a current-state board and its future states
export function StateSwitcher({ board }: { board: Board }) {
  const [, navigate] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: linked } = useQuery<Linked>({
    queryKey: ["/api/boards", String(board.id), "linked"],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${board.id}/linked`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load linked boards");
      return res.json();
    },
  });

  const isFuture = board.state === "future";
  const current = linked?.current ?? null;
  const futures = linked?.futures ?? [];
  // The future state that "Future" and "Compare" point at
  const activeFuture = isFuture ? futures.find((f) => f.id === board.id) ?? null : futures[0] ?? null;

  // A future state described from scratch has nothing to switch to
  if (isFuture && !current) {
    return <span className={segment(true) + " inline-flex items-center"}>Future state</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5 rounded bg-white/10 p-0.5" role="tablist" aria-label="Blueprint state">
        <button
          role="tab"
          aria-selected={!isFuture}
          className={segment(!isFuture)}
          onClick={() => isFuture && current && navigate(`/board/${current.id}`)}
        >
          Current
        </button>

        {futures.length === 0 ? (
          <button className={segment(false) + " inline-flex items-center gap-1"} onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Future
          </button>
        ) : futures.length === 1 ? (
          <button
            role="tab"
            aria-selected={isFuture}
            className={segment(isFuture)}
            onClick={() => !isFuture && navigate(`/board/${futures[0].id}`)}
          >
            Future
          </button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button role="tab" aria-selected={isFuture} className={segment(isFuture) + " inline-flex items-center gap-1"}>
                Future
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[240px]">
              {futures.map((f) => (
                <DropdownMenuItem key={f.id} onClick={() => navigate(`/board/${f.id}`)} className={f.id === board.id ? "font-bold" : ""}>
                  {f.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New future state…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {activeFuture && (
        <Button asChild variant="ghost" className="h-8 px-2.5 text-xs text-white/90 hover:text-ds-pop hover:bg-white/10" title="Compare current and future state">
          <Link href={`/board/${activeFuture.id}/compare`}>
            <GitCompareArrows className="mr-1.5 h-4 w-4" />
            Compare
          </Link>
        </Button>
      )}

      {futures.length === 1 && !isFuture && (
        <Button
          variant="ghost"
          className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10"
          title="New future state"
          aria-label="New future state"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}

      <CreateFutureStateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        currentBoardId={current?.id ?? board.id}
        currentName={current?.name ?? board.name}
      />
    </div>
  );
}

function CreateFutureStateDialog({
  open,
  onOpenChange,
  currentBoardId,
  currentName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBoardId: number;
  currentName: string;
}) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [goal, setGoal] = useState("");

  const { data: aiStatus } = useQuery<{ available: boolean }>({
    queryKey: ["/api/ai/status"],
    queryFn: async () => {
      const res = await fetch("/api/ai/status", { credentials: "include" });
      return res.ok ? res.json() : { available: false };
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const create = useMutation({
    mutationFn: async (mode: "ai" | "copy") => {
      const res = await fetch(`/api/boards/${currentBoardId}/future-states`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, goal: goal.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || "Couldn't create the future state");
      return data as { id: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      onOpenChange(false);
      setGoal("");
      navigate(`/board/${data.id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't create the future state", description: error.message, variant: "destructive" });
    },
  });

  const pending = create.isPending;
  const aiPending = pending && create.variables === "ai";

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-ds-ink text-xl font-semibold">New future state</DialogTitle>
          <DialogDescription className="text-ds-ink-muted">
            A separate blueprint linked to “{currentName}”, so you can switch between them and compare.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label htmlFor="future-goal" className="text-sm font-medium text-ds-ink">What should the future state achieve?</label>
          <Textarea
            id="future-goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={pending}
            rows={4}
            maxLength={5000}
            placeholder="e.g. Replace the sales call with self-serve sign-up so customers get value on day one. Keep sales for enterprise deals."
            className="border-ds-line focus-visible:ring-[color-mix(in_srgb,var(--ds-accent)_30%,transparent)] placeholder:text-[color-mix(in_srgb,var(--ds-ink-muted)_50%,transparent)]"
          />
          <p className="text-xs text-ds-ink-muted">
            The AI can redesign the journey from scratch. Each change notes which current frictions it fixes, and Compare shows what's still unaddressed.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {aiPending && <span className="mr-auto text-xs text-ds-ink-muted">Redesigning the journey usually takes about a minute…</span>}
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => create.mutate("copy")}
            className="border-ds-line text-ds-ink hover:bg-[color-mix(in_srgb,var(--ds-surface-hover)_20%,transparent)] hover:border-ds-accent"
          >
            {pending && !aiPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
            Start from a copy
          </Button>
          {aiStatus?.available && (
            <Button
              disabled={pending}
              onClick={() => create.mutate("ai")}
              className="bg-ds-accent hover:bg-ds-ink text-white"
            >
              {aiPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {aiPending ? "Drafting…" : "Draft with AI"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
