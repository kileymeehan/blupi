import type { Block, Board, Phase } from "@shared/schema";

// Undo for deletions. Each function puts deleted items back into the board as
// it is *now*, rather than restoring an old snapshot, so changes made since the
// delete (including by collaborators) are kept. Returns null if the place the
// item came from no longer exists.

type Column = Phase["columns"][number];

// A deleted block and where it sat in board.blocks (order within a column
// follows array order)
export type RemovedBlock = { block: Block; index: number };

export type DeletedItems =
  | { kind: "blocks"; blocks: RemovedBlock[] }
  | { kind: "column"; phaseId: string; columnIndex: number; column: Column; blocks: RemovedBlock[] }
  | { kind: "phase"; phaseIndex: number; phase: Phase; blocks: RemovedBlock[] };

export type RestoreResult = { phases?: Phase[]; blocks: Block[] } | null;

// Records which blocks a delete removes, and from where
export function captureBlocks(blocks: Block[], shouldRemove: (block: Block) => boolean): RemovedBlock[] {
  return blocks.flatMap((block, index) => (shouldRemove(block) ? [{ block: structuredClone(block), index }] : []));
}

// Insert removed blocks back near their original positions
function insertBlocks(current: Block[], removed: RemovedBlock[], place: (block: Block) => Block): Block[] {
  const present = new Set(current.map((b) => b.id));
  const result = [...current];
  for (const { block, index } of [...removed].sort((a, b) => a.index - b.index)) {
    if (present.has(block.id)) continue; // already back (e.g. undone elsewhere)
    result.splice(Math.min(index, result.length), 0, place(block));
  }
  return result;
}

export function restore(board: Board, deleted: DeletedItems): RestoreResult {
  if (deleted.kind === "blocks") {
    // Skip cards whose step has since been removed
    const exists = (b: Block) => !!board.phases[b.phaseIndex]?.columns[b.columnIndex];
    const restorable = deleted.blocks.filter(({ block }) => exists(block));
    if (restorable.length === 0) return null;
    return { blocks: insertBlocks(board.blocks, restorable, (b) => b) };
  }

  if (deleted.kind === "column") {
    // Find the phase by ID: phases may have been reordered since
    const phaseIndex = board.phases.findIndex((p) => p.id === deleted.phaseId);
    if (phaseIndex < 0) return null;
    const columnIndex = Math.min(deleted.columnIndex, board.phases[phaseIndex].columns.length);

    const phases = board.phases.map((p, i) =>
      i === phaseIndex
        ? { ...p, columns: [...p.columns.slice(0, columnIndex), deleted.column, ...p.columns.slice(columnIndex)] }
        : p,
    );
    // Make room: later columns in this phase shift right
    const shifted = board.blocks.map((b) =>
      b.phaseIndex === phaseIndex && b.columnIndex >= columnIndex ? { ...b, columnIndex: b.columnIndex + 1 } : b,
    );
    const blocks = insertBlocks(shifted, deleted.blocks, (b) => ({ ...b, phaseIndex, columnIndex }));
    return { phases, blocks };
  }

  const phaseIndex = Math.min(deleted.phaseIndex, board.phases.length);
  const phases = [...board.phases.slice(0, phaseIndex), deleted.phase, ...board.phases.slice(phaseIndex)];
  const shifted = board.blocks.map((b) => (b.phaseIndex >= phaseIndex ? { ...b, phaseIndex: b.phaseIndex + 1 } : b));
  const blocks = insertBlocks(shifted, deleted.blocks, (b) => ({ ...b, phaseIndex }));
  return { phases, blocks };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Toast text, e.g. `Step "Sign up" deleted (3 cards)`
export function describe(deleted: DeletedItems): string {
  if (deleted.kind === "blocks") {
    return deleted.blocks.length === 1 ? "Card deleted" : `${plural(deleted.blocks.length, "card")} deleted`;
  }
  const cards = deleted.blocks.length ? ` (${plural(deleted.blocks.length, "card")})` : "";
  if (deleted.kind === "column") {
    return `Step "${deleted.column.name || "Untitled"}" deleted${cards}`;
  }
  const steps = plural(deleted.phase.columns.length, "step");
  const contents = deleted.blocks.length ? `${steps}, ${plural(deleted.blocks.length, "card")}` : steps;
  return `Phase "${deleted.phase.name || "Untitled"}" deleted (${contents})`;
}
