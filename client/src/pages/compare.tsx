import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import type { Block, Board, Column } from "@shared/schema";

// Board text comes from a rich-text editor; show it as plain text. DOMParser
// builds an inert document, so markup in a card can't run scripts or load images.
const parser = new DOMParser();
const plain = (html: string) =>
  (parser.parseFromString(html, "text/html").body.textContent || "").replace(/\s+/g, " ").trim();

async function fetchBoard(id: number | string): Promise<Board> {
  const res = await fetch(`/api/boards/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error("Couldn't load the blueprint");
  return res.json();
}

type Step = Column & { phase: string; phaseIndex: number; columnIndex: number };
const stepsOf = (board: Board): Step[] =>
  board.phases.flatMap((phase, phaseIndex) =>
    phase.columns.map((column, columnIndex) => ({ ...column, phase: phase.name, phaseIndex, columnIndex })),
  );
const stepAt = (steps: Step[], b: Block) => steps.find((s) => s.phaseIndex === b.phaseIndex && s.columnIndex === b.columnIndex);

const PILL: Record<string, string> = {
  fixed: "bg-green-100 text-green-800",
  removed: "bg-blue-100 text-blue-800",
  open: "bg-amber-100 text-amber-800",
  new: "bg-green-100 text-green-800",
  reworked: "bg-blue-100 text-blue-800",
  same: "bg-gray-100 text-gray-600",
};
const Pill = ({ kind, children }: { kind: string; children: React.ReactNode }) => (
  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${PILL[kind]}`}>
    {children}
  </span>
);

const sectionTitle = "text-base font-black uppercase tracking-widest text-[#0A0A0F]";
const th = "pb-2 text-[11px] font-bold uppercase tracking-widest text-gray-500";

export default function ComparePage() {
  const { id } = useParams();

  const { data: future, isLoading: futureLoading, error: futureError } = useQuery({
    queryKey: ["/api/boards", id],
    queryFn: () => fetchBoard(id!),
  });
  const currentId = future?.basedOnBoardId;
  const { data: current, isLoading: currentLoading } = useQuery({
    queryKey: ["/api/boards", String(currentId)],
    queryFn: () => fetchBoard(currentId!),
    enabled: !!currentId,
  });

  if (futureLoading || (currentId && currentLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }
  if (futureError || !future) {
    return <div className="p-10 text-center text-gray-500">Couldn't load this blueprint.</div>;
  }
  if (!current) {
    return (
      <div className="min-h-screen bauhaus-halftone-bg">
        <PageHeader title="Compare" backTo={`/board/${future.id}`} backLabel="Back" />
        <p className="p-10 text-center text-gray-500">This future state isn't linked to a current-state blueprint, so there's nothing to compare.</p>
      </div>
    );
  }

  const currentSteps = stepsOf(current);
  const futureSteps = stepsOf(future);
  const currentStepName = new Map(currentSteps.map((s) => [s.id, s.name]));

  // Steps
  const carried = new Set(futureSteps.flatMap((s) => s.basedOnColumnIds ?? []));
  const removedSteps = currentSteps.filter((s) => !carried.has(s.id));
  const stepKind = (s: Step) => {
    const basedOn = s.basedOnColumnIds ?? [];
    if (basedOn.length === 0) return "new";
    if (basedOn.length === 1 && currentStepName.get(basedOn[0])?.trim() === s.name.trim()) return "same";
    return "reworked";
  };
  const counts = { new: 0, reworked: 0, same: 0 };
  futureSteps.forEach((s) => counts[stepKind(s)]++);

  // Frictions
  const startedFromCopy = future.blocks.some((b) => b.basedOnBlockId);
  const frictions = current.blocks
    .filter((b) => b.type === "friction" && plain(b.content))
    .map((f) => {
      const fixes = future.blocks.filter((b) => b.resolvesBlockIds?.includes(f.id));
      const stillThere = future.blocks.some((b) => b.basedOnBlockId === f.id);
      const status = fixes.length ? "fixed" : startedFromCopy && !stillThere ? "removed" : "open";
      return { block: f, step: stepAt(currentSteps, f), fixes, status, stillThere };
    });
  const order = { open: 0, removed: 1, fixed: 2 } as const;
  frictions.sort((a, b) => order[a.status as keyof typeof order] - order[b.status as keyof typeof order]);
  const fixedCount = frictions.filter((f) => f.status === "fixed").length;
  const openCount = frictions.filter((f) => f.status === "open").length;

  return (
    <div className="min-h-screen bauhaus-halftone-bg">
      <PageHeader title="Compare" backTo={`/board/${future.id}`} backLabel="Back to future state" />

      <main className="mx-auto max-w-[1100px] space-y-6 px-6 py-8">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <Link href={`/board/${current.id}`} className="font-bold text-[#0A0A0F] hover:underline">{current.name}</Link>
            <ArrowRight className="h-4 w-4" />
            <Link href={`/board/${future.id}`} className="font-bold text-[#0A0A0F] hover:underline">{future.name}</Link>
          </div>
          {future.description && <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-gray-600">{plain(future.description)}</p>}
        </div>

        {/* Summary */}
        <section className="bauhaus-card grid grid-cols-2 gap-6 p-6 md:grid-cols-4">
          {[
            { value: frictions.length ? `${fixedCount}/${frictions.length}` : "–", label: "Frictions fixed" },
            { value: openCount, label: "Not addressed" },
            { value: `${currentSteps.length} → ${futureSteps.length}`, label: "Steps" },
            { value: `${counts.new} new · ${removedSteps.length} removed`, label: "Structure" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-black text-[#0A0A0F]">{stat.value}</div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{stat.label}</div>
            </div>
          ))}
        </section>

        {/* Frictions */}
        <section className="bauhaus-card p-6">
          <h2 className={`${sectionTitle} mb-1`}>Frictions</h2>
          <p className="mb-4 text-sm text-gray-500">Every friction on the current state, and whether the future state deals with it.</p>
          {frictions.length === 0 ? (
            <p className="py-2 text-sm text-gray-500">The current state has no friction cards yet.</p>
          ) : (
            <table className="w-full table-fixed text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className={`${th} pl-1`}>Friction today</th>
                  <th className={`${th} w-[150px]`}>Status</th>
                  <th className={`${th} w-[38%]`}>In the future state</th>
                </tr>
              </thead>
              <tbody>
                {frictions.map(({ block, step, fixes, status, stillThere }) => (
                  <tr key={block.id} className="border-b border-gray-100 align-top last:border-0">
                    <td className="py-3 pl-1 pr-4">
                      <div className="text-sm text-[#0A0A0F]">{plain(block.content)}</div>
                      {step && <div className="mt-0.5 text-xs text-gray-500">{step.phase} · {step.name}</div>}
                    </td>
                    <td className="py-3">
                      <Pill kind={status}>{status === "fixed" ? "Fixed" : status === "removed" ? "Removed" : "Not addressed"}</Pill>
                    </td>
                    <td className="py-3 text-sm text-gray-600">
                      {fixes.length > 0 ? (
                        <ul className="space-y-2">
                          {fixes.map((fix) => {
                            const s = stepAt(futureSteps, fix);
                            return (
                              <li key={fix.id}>
                                {s && <span className="font-bold text-[#0A0A0F]">{s.name}: </span>}
                                {plain(fix.content)}
                              </li>
                            );
                          })}
                        </ul>
                      ) : status === "removed" ? (
                        "The card was deleted from the future state, but no change is linked to it."
                      ) : stillThere ? (
                        "Still on the future state."
                      ) : (
                        "No change in the future state addresses this yet."
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Steps */}
        <section className="bauhaus-card p-6">
          <h2 className={`${sectionTitle} mb-1`}>Steps</h2>
          <p className="mb-4 text-sm text-gray-500">The future journey, and the current steps each one replaces.</p>
          <table className="w-full table-fixed text-left">
            <thead>
              <tr className="border-b border-gray-200">
                <th className={`${th} pl-1`}>Future step</th>
                <th className={`${th} w-[120px]`}>Change</th>
                <th className={`${th} w-[42%]`}>Replaces today</th>
              </tr>
            </thead>
            <tbody>
              {futureSteps.map((s) => {
                const kind = stepKind(s);
                return (
                  <tr key={s.id} className="border-b border-gray-100 align-top last:border-0">
                    <td className="py-3 pl-1 pr-4">
                      <div className="text-sm font-bold text-[#0A0A0F]">{s.name}</div>
                      <div className="text-xs text-gray-500">{s.phase}</div>
                    </td>
                    <td className="py-3"><Pill kind={kind}>{kind === "new" ? "New" : kind === "same" ? "Same" : "Reworked"}</Pill></td>
                    <td className="py-3 text-sm text-gray-600">
                      {(s.basedOnColumnIds ?? []).map((cid) => currentStepName.get(cid)).filter(Boolean).join(", ") || "–"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {removedSteps.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-gray-500">Removed from the journey</h3>
              <ul className="flex flex-wrap gap-2">
                {removedSteps.map((s) => (
                  <li key={s.id} className="rounded bg-gray-100 px-2.5 py-1 text-sm text-gray-600 line-through decoration-gray-400">
                    {s.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
