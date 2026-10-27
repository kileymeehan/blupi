import type { Server, IncomingMessage } from "http";
import type { Request, Response } from "express";
import { WebSocketServer, WebSocket } from "ws";
import { nanoid } from "nanoid";
import { sessionMiddleware } from "./session";
import { tenantMiddleware } from "./tenant-middleware";
import { storage } from "./storage";
import { displayNameFor } from "./auth";

// Live presence on a board: who's here, where their cursor is, and which card
// they're editing or dragging. Board content itself is still saved over HTTP.
//
// Client → server:
//   { type: 'subscribe', boardId }
//   { type: 'cursor', anchor: CursorAnchor | null }   (null = left the canvas)
//   { type: 'focus', blockId: string | null, mode: 'editing' | 'dragging' }
// Server → client:
//   { type: 'welcome', connectionId }
//   { type: 'users_update', users: PresenceUser[] }
//   { type: 'cursor', connectionId, userId, anchor }
//   { type: 'focus', connectionId, userId, blockId, mode }
//   { type: 'left', connectionId }
//   { type: 'board_changed', boardId }   (after a save; others re-fetch the board)

// Where a cursor is, relative to something both screens have. Column widths
// change with screen size, so raw pixels would point at the wrong card.
type CursorAnchor = {
  kind: "block" | "column" | "board";
  id?: string;
  x: number; // fraction of the element's width
  y: number; // fraction of height for blocks, pixels from the top otherwise
};

type Connection = {
  id: string;
  ws: WebSocket;
  userId: number;
  name: string;
  color: string;
  avatar: string | null;
  boardId: string | null;
  lastCursorAt: number;
  isAlive: boolean;
};

// Distinct, readable with white text
const COLORS = [
  "#E5484D", "#F76B15", "#D6409F", "#8E4EC6",
  "#3E63DD", "#0090FF", "#12A594", "#30A46C",
];

const CURSOR_MIN_INTERVAL_MS = 25;

let notifyChanged: ((boardId: string, exceptConnectionId?: string) => void) | null = null;

// Called after a board is saved over HTTP. The saving tab passes its own
// connection ID (X-Collab-Connection header) so it isn't told about its own change.
export function notifyBoardChanged(boardId: number | string, exceptConnectionId?: string) {
  notifyChanged?.(String(boardId), exceptConnectionId);
}

function colorFor(userId: number) {
  return COLORS[userId % COLORS.length];
}

// Run Express middleware against the raw upgrade request
function runMiddleware(
  middleware: (req: Request, res: Response, next: (err?: unknown) => void) => unknown,
  req: IncomingMessage,
) {
  return new Promise<void>((resolve, reject) => {
    middleware(req as Request, {} as Response, (err?: unknown) => (err ? reject(err) : resolve()));
  });
}

function parseAnchor(raw: unknown): CursorAnchor | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  if (a.kind !== "block" && a.kind !== "column" && a.kind !== "board") return null;
  if (typeof a.x !== "number" || typeof a.y !== "number" || !isFinite(a.x) || !isFinite(a.y)) return null;
  if (a.id !== undefined && (typeof a.id !== "string" || a.id.length > 200)) return null;
  return { kind: a.kind, id: a.id as string | undefined, x: a.x, y: a.y };
}

export function setupCollaboration(httpServer: Server) {
  const connections = new Map<string, Connection>();

  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws",
    perMessageDeflate: false,
    maxPayload: 64 * 1024,
    // Only accept connections from pages served by this app
    verifyClient: ({ origin, req }: { origin: string; req: IncomingMessage }) => {
      try {
        return !!origin && new URL(origin).host === req.headers.host;
      } catch {
        return false;
      }
    },
  });

  const send = (ws: WebSocket, message: object) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  };

  const broadcast = (boardId: string, message: object, except?: Connection) => {
    const data = JSON.stringify(message);
    connections.forEach((c) => {
      if (c.boardId === boardId && c !== except && c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(data);
      }
    });
  };

  // One entry per person, even with the board open in several tabs
  const sendUsers = (boardId: string) => {
    const users = new Map<number, object>();
    connections.forEach((c) => {
      if (c.boardId !== boardId || users.has(c.userId)) return;
      const isImage = !!c.avatar && /^(https?:|\/|data:image\/)/.test(c.avatar);
      users.set(c.userId, {
        id: String(c.userId),
        name: c.name,
        color: c.color,
        photoURL: isImage ? c.avatar : undefined,
        emoji: c.avatar && !isImage ? c.avatar : undefined,
      });
    });
    broadcast(boardId, { type: "users_update", users: Array.from(users.values()) });
  };

  notifyChanged = (boardId, exceptConnectionId) => {
    broadcast(boardId, { type: "board_changed", boardId }, exceptConnectionId ? connections.get(exceptConnectionId) : undefined);
  };

  const leaveBoard = (conn: Connection) => {
    const boardId = conn.boardId;
    if (!boardId) return;
    conn.boardId = null;
    broadcast(boardId, { type: "left", connectionId: conn.id });
    sendUsers(boardId);
  };

  wss.on("connection", async (ws, req) => {
    // Buffer messages that arrive while the session is being looked up
    const pending: Buffer[] = [];
    const queue = (data: Buffer) => pending.push(data);
    ws.on("message", queue);

    let conn: Connection;
    try {
      await runMiddleware(sessionMiddleware as any, req);
      await runMiddleware(tenantMiddleware as any, req);
      const userId = (req as Request).userId;
      const user = userId ? await storage.getUser(userId) : undefined;
      if (!user) {
        ws.close(4401, "Not signed in");
        return;
      }
      conn = {
        id: nanoid(),
        ws,
        userId: user.id,
        name: displayNameFor(user),
        color: colorFor(user.id),
        avatar: user.profileImageUrl || null,
        boardId: null,
        lastCursorAt: 0,
        isAlive: true,
      };
    } catch (err) {
      console.error("[WS] Could not authenticate connection:", err);
      ws.close(1011, "Server error");
      return;
    }

    // The socket may have closed while the session was being looked up
    if (ws.readyState !== WebSocket.OPEN) return;

    const tenantId = (req as Request).tenantId;
    connections.set(conn.id, conn);
    send(ws, { type: "welcome", connectionId: conn.id });

    const handleMessage = async (data: Buffer) => {
      let message: any;
      try {
        message = JSON.parse(data.toString());
      } catch {
        return;
      }

      if (message.type === "subscribe") {
        const boardId = Number(message.boardId);
        // Same access rule as GET /api/boards/:id
        const board = tenantId && Number.isInteger(boardId)
          ? await storage.getBoard(boardId, tenantId).catch(() => undefined)
          : undefined;
        if (!board) {
          send(ws, { type: "error", message: "Board not found" });
          return;
        }
        if (conn.boardId && conn.boardId !== String(boardId)) leaveBoard(conn);
        conn.boardId = String(boardId);
        sendUsers(conn.boardId);
        return;
      }

      if (!conn.boardId) return;

      if (message.type === "cursor") {
        const now = Date.now();
        if (now - conn.lastCursorAt < CURSOR_MIN_INTERVAL_MS) return;
        conn.lastCursorAt = now;
        broadcast(conn.boardId, {
          type: "cursor",
          connectionId: conn.id,
          userId: String(conn.userId),
          anchor: parseAnchor(message.anchor),
        }, conn);
        return;
      }

      if (message.type === "focus") {
        const blockId = typeof message.blockId === "string" && message.blockId.length <= 200 ? message.blockId : null;
        broadcast(conn.boardId, {
          type: "focus",
          connectionId: conn.id,
          userId: String(conn.userId),
          blockId,
          mode: message.mode === "dragging" ? "dragging" : "editing",
        }, conn);
      }
      // Anything else (including the old client-sent 'board_update') is ignored
    };

    ws.off("message", queue);
    ws.on("message", handleMessage);
    for (const data of pending) await handleMessage(data);

    ws.on("pong", () => { conn.isAlive = true; });
    ws.on("close", () => {
      leaveBoard(conn);
      connections.delete(conn.id);
    });
    ws.on("error", (err) => console.error(`[WS] Connection error (${conn.id}):`, err));
  });

  // Drop connections that stop answering pings (closed laptop, lost network)
  const heartbeat = setInterval(() => {
    connections.forEach((conn) => {
      if (!conn.isAlive) {
        conn.ws.terminate();
        return;
      }
      conn.isAlive = false;
      conn.ws.ping();
    });
  }, 30000);
  wss.on("close", () => clearInterval(heartbeat));
  wss.on("error", (err) => console.error("[WS] Server error:", err));

  console.log("[WS] Collaboration server ready on /ws");
}
