import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { insertBoardSchema, type InsertBoard, type BoardState } from "@shared/schema";
import { nanoid } from 'nanoid';

interface CreateBlueprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: number;
}

type Mode = 'blank' | 'describe';

const STATE_OPTIONS: { value: BoardState; label: string; hint: string }[] = [
  { value: 'current', label: 'Current state', hint: 'How the journey works today' },
  { value: 'future', label: 'Future state', hint: 'An experience you are proposing' },
];

function StatePicker({ value, onChange, disabled }: { value: BoardState; onChange: (v: BoardState) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Blueprint state">
      {STATE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={`rounded border px-3 py-2 text-left transition-colors ${
            value === opt.value
              ? 'border-[#302E87] bg-[#302E87]/5'
              : 'border-[#A1D9F5] hover:border-[#302E87]/50'
          }`}
        >
          <div className="text-sm font-semibold text-[#302E87]">{opt.label}</div>
          <div className="text-xs text-[#6B6B97]">{opt.hint}</div>
        </button>
      ))}
    </div>
  );
}

export function CreateBlueprintDialog({ open, onOpenChange, projectId }: CreateBlueprintDialogProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>('blank');
  const [state, setState] = useState<BoardState>('current');
  const [description, setDescription] = useState('');
  const [aiName, setAiName] = useState('');

  const { data: aiStatus } = useQuery<{ available: boolean }>({
    queryKey: ['/api/ai/status'],
    queryFn: async () => {
      const res = await fetch('/api/ai/status', { credentials: 'include' });
      return res.ok ? res.json() : { available: false };
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const aiAvailable = !!aiStatus?.available;

  const form = useForm<InsertBoard>({
    resolver: zodResolver(insertBoardSchema),
    defaultValues: {
      name: "",
      description: "",
      blocks: [],
      status: "draft",
      phases: [{
        id: nanoid(),
        name: 'Phase 1',
        columns: [{
          id: nanoid(),
          name: 'Step 1',
          image: undefined
        }]
      }],
      projectId: projectId || undefined
    },
  });

  const finish = (boardId: number) => {
    // Invalidate all boards queries to ensure the new blueprint appears
    queryClient.invalidateQueries({ queryKey: ['/api/boards'] });

    // Also invalidate project-specific queries if this is tied to a project
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'boards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
    }

    onOpenChange(false);
    form.reset();
    setDescription('');
    setAiName('');
    setMode('blank');
    setState('current');
    navigate(`/board/${boardId}`);
  };

  const showError = (error: Error) => {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive",
    });
  };

  const createBlueprint = useMutation({
    mutationFn: async (data: InsertBoard) => {
      const response = await fetch("/api/boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          state,
          projectId: projectId || null
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.message?.includes("session format is outdated")) {
          throw new Error("Your account session is outdated. Please sign out and create a new account to continue.");
        }
        throw new Error(error.message || "Failed to create blueprint");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Blueprint created successfully",
      });
      finish(data.id);
    },
    onError: showError,
  });

  const draftBlueprint = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/ai/blueprints", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: description,
          state,
          name: aiName.trim() || undefined,
          projectId: projectId || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || "Couldn't draft the blueprint");
      return data as { id: number };
    },
    onSuccess: (data) => finish(data.id),
    onError: showError,
  });

  const busy = createBlueprint.isPending || draftBlueprint.isPending;
  const tooShort = description.trim().length < 20;

  return (
    <Dialog open={open} onOpenChange={(next) => !draftBlueprint.isPending && onOpenChange(next)}>
      <DialogContent className={mode === 'describe' ? 'sm:max-w-2xl' : undefined}>
        <DialogHeader>
          <DialogTitle className="text-[#302E87] text-xl font-semibold">Create New Blueprint</DialogTitle>
          <DialogDescription className="text-[#6B6B97]">
            {mode === 'describe'
              ? 'Describe the journey and AI drafts the blueprint for you to edit'
              : 'Create a new blueprint to design your workflow'}
          </DialogDescription>
        </DialogHeader>

        {aiAvailable && (
          <div className="flex rounded-md bg-gray-100 p-1" role="tablist">
            {([['blank', 'Start blank'], ['describe', 'Describe it']] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                disabled={busy}
                onClick={() => setMode(value)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === value ? 'bg-white text-[#302E87] shadow-sm' : 'text-[#6B6B97] hover:text-[#302E87]'
                }`}
              >
                {value === 'describe' && <Sparkles className="h-3.5 w-3.5" />}
                {label}
              </button>
            ))}
          </div>
        )}

        {mode === 'describe' && aiAvailable ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!tooShort) draftBlueprint.mutate();
            }}
          >
            <StatePicker value={state} onChange={setState} disabled={busy} />

            <div className="space-y-2">
              <label htmlFor="ai-description" className="text-sm font-medium text-[#302E87]">
                {state === 'future' ? 'Describe the experience you want' : 'Describe how the journey works'}
              </label>
              <Textarea
                id="ai-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={busy}
                rows={9}
                maxLength={20000}
                placeholder={state === 'future'
                  ? 'Walk through the proposed journey step by step: what the customer does, what happens behind the scenes, and what should be different from today.'
                  : 'Walk through the journey step by step, or paste interview notes, support tickets or part of a spec. Mention problems customers run into.'}
                className="border-[#A1D9F5] focus-visible:ring-[#302E87]/30 placeholder:text-[#6B6B97]/50 resize-y"
              />
              <p className="text-xs text-[#6B6B97]">
                Problems your text describes become friction cards. Anything the AI infers becomes a hypothesis or question, and every AI card is tagged until someone edits it.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="ai-name" className="text-sm font-medium text-[#302E87]">Name</label>
              <Input
                id="ai-name"
                value={aiName}
                onChange={(e) => setAiName(e.target.value)}
                disabled={busy}
                placeholder="Optional. AI will suggest one"
                className="border-[#A1D9F5] focus-visible:ring-[#302E87]/30 placeholder:text-[#6B6B97]/50"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              {draftBlueprint.isPending && (
                <span className="mr-auto text-xs text-[#6B6B97]">This usually takes 20–40 seconds…</span>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={busy}
                className="border-[#A1D9F5] text-[#302E87] hover:bg-[#FFE8D6]/20 hover:border-[#302E87]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={busy || tooShort}
                className="bg-[#302E87] hover:bg-[#252270] text-white"
              >
                {draftBlueprint.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Drafting…</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" />Draft blueprint</>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createBlueprint.mutate(data))} className="space-y-4">
              <StatePicker value={state} onChange={setState} disabled={busy} />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#302E87]">Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter blueprint name"
                        className="border-[#A1D9F5] focus-visible:ring-[#302E87]/30 placeholder:text-[#6B6B97]/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#302E87]">Description</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter blueprint description (optional)"
                        value={field.value || ''}
                        onChange={field.onChange}
                        className="border-[#A1D9F5] focus-visible:ring-[#302E87]/30 placeholder:text-[#6B6B97]/50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={busy}
                  className="border-[#A1D9F5] text-[#302E87] hover:bg-[#FFE8D6]/20 hover:border-[#302E87]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={busy}
                  className="bg-[#302E87] hover:bg-[#252270] text-white"
                >
                  {createBlueprint.isPending ? "Creating..." : "Create Blueprint"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
