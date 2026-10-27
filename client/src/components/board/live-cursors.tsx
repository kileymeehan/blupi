import { useEffect, useRef, useState, type RefObject } from "react";
import type { Collaboration, ConnectedUser } from "@/hooks/use-websocket";
import { getAnimalEmoji } from "./users-presence";

// Other people's cursors and the cards they're editing or dragging, drawn over
// the board. Positions are sent relative to a card or column rather than in
// screen pixels, because column widths differ between screen sizes.
//
// Cursor updates arrive ~20 times a second, so positions live in refs and are
// applied to the DOM in an animation frame; React only re-renders when someone
// joins, leaves, or changes focus.

type Anchor =
  | { kind: "block" | "column"; id: string; x: number; y: number }
  | { kind: "board"; x: number; y: number };

type Remote = {
  userId: string;
  anchor: Anchor | null;
  focus: { blockId: string; mode: "editing" | "dragging" } | null;
  pos: { x: number; y: number } | null;
};

const SEND_INTERVAL_MS = 50;
const SMOOTHING = 0.35;

const isImage = (src?: string) => !!src && /^(https?:|\/|data:image\/)/.test(src);

function findBlock(container: HTMLElement, id: string) {
  return container.querySelector<HTMLElement>(`[data-rfd-draggable-id="${CSS.escape(id)}"]`);
}

function blockIdOf(el: Element | null) {
  const draggable = el?.closest<HTMLElement>("[data-rfd-draggable-id]");
  const id = draggable?.dataset.rfdDraggableId;
  return id && !id.startsWith("column-") ? { id, el: draggable! } : null;
}

// What's under the pointer, as an anchor other screens can resolve
function anchorAt(container: HTMLElement, clientX: number, clientY: number): Anchor {
  for (const el of document.elementsFromPoint(clientX, clientY)) {
    if (!container.contains(el) || el.closest("[data-live-cursors]")) continue;
    // Skip a card we're dragging; on other screens it's still in its old spot
    const dragged = el.closest<HTMLElement>("[data-rfd-draggable-id]");
    if (dragged && dragged.style.position === "fixed") continue;

    const block = blockIdOf(el);
    if (block) {
      const r = block.el.getBoundingClientRect();
      return { kind: "block", id: block.id, x: (clientX - r.left) / r.width, y: (clientY - r.top) / r.height };
    }
    const column = el.closest<HTMLElement>("[data-column-id]");
    if (column?.dataset.columnId) {
      const r = column.getBoundingClientRect();
      return { kind: "column", id: column.dataset.columnId, x: (clientX - r.left) / r.width, y: clientY - r.top };
    }
    break;
  }
  const r = container.getBoundingClientRect();
  return { kind: "board", x: clientX - r.left, y: clientY - r.top };
}

// Anchor → position inside the container, or null if that card isn't visible here
function resolve(container: HTMLElement, anchor: Anchor) {
  if (anchor.kind === "board") return { x: anchor.x, y: anchor.y };
  const el = anchor.kind === "block"
    ? findBlock(container, anchor.id)
    : container.querySelector<HTMLElement>(`[data-column-id="${CSS.escape(anchor.id)}"]`);
  if (!el) return null;
  const c = container.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return {
    x: r.left - c.left + anchor.x * r.width,
    y: r.top - c.top + (anchor.kind === "block" ? anchor.y * r.height : anchor.y),
  };
}

function UserBadge({ user, color }: { user?: ConnectedUser; color: string }) {
  const firstName = user?.name.split(/[\s@]/)[0] || "Someone";
  return (
    <div
      className="flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2 text-[11px] font-bold leading-none text-white shadow-md whitespace-nowrap"
      style={{ backgroundColor: color }}
    >
      <span className="flex h-[18px] w-[18px] items-center justify-center overflow-hidden rounded-full bg-white text-[11px]">
        {isImage(user?.photoURL) ? (
          <img src={user!.photoURL} alt="" className="h-full w-full object-cover" />
        ) : (
          user?.emoji || getAnimalEmoji(user?.id ?? firstName)
        )}
      </span>
      {firstName}
    </div>
  );
}

interface LiveCursorsProps {
  containerRef: RefObject<HTMLElement>;
  collaboration: Collaboration;
  users: ConnectedUser[];
}

export function LiveCursors({ containerRef, collaboration, users }: LiveCursorsProps) {
  const remotes = useRef(new Map<string, Remote>());
  const cursorEls = useRef(new Map<string, HTMLDivElement>());
  const focusEls = useRef(new Map<string, HTMLDivElement>());
  const [, setVersion] = useState(0);
  const rerender = () => setVersion((v) => v + 1);

  // Incoming presence
  useEffect(() => {
    return collaboration.subscribe((msg) => {
      const map = remotes.current;
      if (msg.type === "left") {
        if (map.delete(msg.connectionId)) rerender();
        return;
      }
      if (msg.type !== "cursor" && msg.type !== "focus") return;

      let remote = map.get(msg.connectionId);
      const isNew = !remote;
      if (!remote) {
        remote = { userId: msg.userId, anchor: null, focus: null, pos: null };
        map.set(msg.connectionId, remote);
      }

      if (msg.type === "cursor") {
        const wasVisible = !!remote.anchor;
        remote.anchor = msg.anchor;
        if (!msg.anchor) remote.pos = null;
        if (isNew || wasVisible !== !!msg.anchor) rerender();
      } else {
        remote.focus = msg.blockId ? { blockId: msg.blockId, mode: msg.mode } : null;
        rerender();
      }
    });
  }, [collaboration]);

  // Forget anyone who has left the board
  useEffect(() => {
    const present = new Set(users.map((u) => u.id));
    let changed = false;
    remotes.current.forEach((r, id) => {
      if (!present.has(r.userId)) {
        remotes.current.delete(id);
        changed = true;
      }
    });
    if (changed) rerender();
  }, [users]);

  // Outgoing: our cursor and the card we're editing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let pointer: { x: number; y: number } | null = null;
    let lastSent = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const sendCursor = () => {
      timer = null;
      lastSent = Date.now();
      collaboration.send({
        type: "cursor",
        anchor: pointer ? anchorAt(container, pointer.x, pointer.y) : null,
      });
    };
    // Throttle, but always send the latest position
    const scheduleSend = () => {
      if (timer) return;
      const wait = Math.max(0, SEND_INTERVAL_MS - (Date.now() - lastSent));
      timer = setTimeout(sendCursor, wait);
    };

    const handleMove = (e: MouseEvent) => {
      pointer = { x: e.clientX, y: e.clientY };
      scheduleSend();
    };
    const handleLeave = () => {
      pointer = null;
      scheduleSend();
    };
    // Scrolling moves the board under a still pointer
    const handleScroll = () => {
      if (pointer) scheduleSend();
    };

    let focusedBlock: string | null = null;
    const handleFocusIn = (e: FocusEvent) => {
      const block = container.contains(e.target as Node) ? blockIdOf(e.target as Element) : null;
      if (block && block.id !== focusedBlock) {
        focusedBlock = block.id;
        collaboration.send({ type: "focus", blockId: block.id, mode: "editing" });
      }
    };
    const handleFocusOut = (e: FocusEvent) => {
      if (!focusedBlock) return;
      // Moving focus within the same card isn't leaving it
      const next = e.relatedTarget as Element | null;
      if (next && blockIdOf(next)?.id === focusedBlock) return;
      focusedBlock = null;
      collaboration.send({ type: "focus", blockId: null });
    };

    container.addEventListener("mousemove", handleMove);
    container.addEventListener("mouseleave", handleLeave);
    window.addEventListener("scroll", handleScroll, true);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    return () => {
      if (timer) clearTimeout(timer);
      container.removeEventListener("mousemove", handleMove);
      container.removeEventListener("mouseleave", handleLeave);
      window.removeEventListener("scroll", handleScroll, true);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, [containerRef, collaboration]);

  // Animate everything toward its target each frame
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const container = containerRef.current;
      if (!container || remotes.current.size === 0) return;
      const c = container.getBoundingClientRect();

      remotes.current.forEach((remote, id) => {
        const cursorEl = cursorEls.current.get(id);
        if (cursorEl) {
          const target = remote.anchor ? resolve(container, remote.anchor) : null;
          if (!target) {
            cursorEl.style.opacity = "0";
          } else {
            // Jump on first sighting, glide afterwards
            const pos = remote.pos
              ? {
                  x: remote.pos.x + (target.x - remote.pos.x) * SMOOTHING,
                  y: remote.pos.y + (target.y - remote.pos.y) * SMOOTHING,
                }
              : target;
            remote.pos = pos;
            cursorEl.style.opacity = "1";
            cursorEl.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
          }
        }

        const focusEl = focusEls.current.get(id);
        if (focusEl && remote.focus) {
          const block = findBlock(container, remote.focus.blockId);
          if (!block) {
            focusEl.style.opacity = "0";
          } else {
            const r = block.getBoundingClientRect();
            focusEl.style.opacity = "1";
            focusEl.style.transform = `translate3d(${r.left - c.left}px, ${r.top - c.top}px, 0)`;
            focusEl.style.width = `${r.width}px`;
            focusEl.style.height = `${r.height}px`;
          }
        }
      });
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [containerRef]);

  const userById = new Map(users.map((u) => [u.id, u]));
  const entries = Array.from(remotes.current.entries());

  return (
    <div data-live-cursors className="pointer-events-none absolute inset-0 z-30 overflow-visible">
      {entries.map(([id, remote]) => {
        if (!remote.focus) return null;
        const user = userById.get(remote.userId);
        const color = user?.color ?? "#3E63DD";
        return (
          <div
            key={`focus-${id}`}
            ref={(el) => (el ? focusEls.current.set(id, el) : focusEls.current.delete(id))}
            className="absolute left-0 top-0 rounded-lg opacity-0"
            style={{ boxShadow: `0 0 0 3px ${color}` }}
          >
            <div className="absolute -top-6 left-0">
              <UserBadge user={user} color={color} />
            </div>
            <span className="sr-only">
              {user?.name} is {remote.focus.mode === "dragging" ? "moving" : "editing"} this card
            </span>
          </div>
        );
      })}

      {entries.map(([id, remote]) => {
        if (!remote.anchor) return null;
        const user = userById.get(remote.userId);
        const color = user?.color ?? "#3E63DD";
        return (
          <div
            key={`cursor-${id}`}
            ref={(el) => (el ? cursorEls.current.set(id, el) : cursorEls.current.delete(id))}
            className="absolute left-0 top-0 opacity-0 transition-opacity duration-150 will-change-transform"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" className="drop-shadow-sm" aria-hidden>
              <path
                d="M3 2.5 L3 16 L6.8 12.6 L9.4 18 L12 16.8 L9.5 11.6 L15 11.4 Z"
                fill={color}
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <div className="absolute left-4 top-4">
              <UserBadge user={user} color={color} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
