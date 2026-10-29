import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createHash, randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { apiTokens, userOrganizations, type Block, type Phase } from "@shared/schema";
import { AiDraftError, aiDraftAvailable, draftFlow, type FlowDraft } from "./ai-draft";

// API for the Blupi Chrome extension, which captures the steps of a flow on
// any website and turns them into a new board.
//
// Signed-in users create tokens in Settings (session auth). The extension then
// sends `Authorization: Bearer <token>` with every request.

const TOKEN_PREFIX = "blupi_";
const CAPTURES_DIR = path.join(process.cwd(), "uploads", "captures");
const MAX_STEPS = 100;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const newId = () => randomBytes(8).toString("hex");

function sessionUserId(req: Request): number | null {
  const id = parseInt(req.session?.userId ?? "", 10);
  return isNaN(id) ? null : id;
}

// Resolves the bearer token to a user and their active workspace
async function requireExtensionToken(req: Request, res: Response, next: NextFunction) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token.startsWith(TOKEN_PREFIX)) {
    return res.status(401).json({ error: true, message: "Missing or invalid extension token" });
  }
  try {
    const [row] = await db.select().from(apiTokens).where(eq(apiTokens.tokenHash, hashToken(token)));
    if (!row) {
      return res.status(401).json({ error: true, message: "This token was revoked or doesn't exist" });
    }
    const [membership] = await db
      .select()
      .from(userOrganizations)
      .where(and(eq(userOrganizations.userId, row.userId), eq(userOrganizations.isActive, true)))
      .limit(1);
    if (!membership) {
      return res.status(403).json({ error: true, message: "No workspace selected for this account" });
    }
    req.userId = row.userId;
    req.tenantId = membership.organizationId;

    // Record use, at most once a minute
    if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > 60_000) {
      db.update(apiTokens).set({ lastUsedAt: new Date() }).where(eq(apiTokens.id, row.id)).catch(() => {});
    }
    next();
  } catch (err) {
    console.error("[Extension] Token check failed:", err);
    res.status(500).json({ error: true, message: "Could not check token" });
  }
}

const stepSchema = z.object({
  title: z.string().trim().max(300).default(""),
  url: z.string().url().max(2000),
  note: z.string().trim().max(5000).optional(),
  // The page's own title when captured; if `title` still matches it, the
  // user didn't rename the step and an AI draft may name it instead
  pageTitle: z.string().trim().max(300).optional(),
  screenshotUrl: z.string().regex(/^\/uploads\/captures\/[a-f0-9-]+\/[a-f0-9]+\.(jpg|png)$/).optional(),
});

const createBoardSchema = z.object({
  name: z.string().trim().min(1).max(200),
  projectId: z.number().int().optional(),
  steps: z.array(stepSchema).min(1).max(MAX_STEPS),
  aiDraft: z.boolean().optional(),
});

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const AI_NOTE = "Drafted by AI from the screenshot. Review before relying on it.";

function block(type: Block["type"], content: string, phaseIndex: number, columnIndex: number, extra: Partial<Block> = {}): Block {
  return {
    id: newId(),
    type,
    content,
    phaseIndex,
    columnIndex,
    comments: [],
    attachments: [],
    isDivider: false,
    flagged: false,
    ...extra,
  };
}

// Phases come from the AI draft when there is one, otherwise one per site
// visited. Each step gets a column (screenshot as its image) and a touchpoint
// card linking to the page; an AI draft adds friction and question cards.
export function buildBoard(steps: z.infer<typeof stepSchema>[], draft?: FlowDraft) {
  const phases: Phase[] = [];
  const blocks: Block[] = [];
  const aiPhaseStarts = new Map((draft?.phases ?? []).map((p) => [p.firstStepIndex, p.name]));

  steps.forEach((step, i) => {
    const host = hostOf(step.url);
    const ai = draft?.steps[i];
    const phaseName = aiPhaseStarts.size ? aiPhaseStarts.get(i) : phases.at(-1)?.name === host ? undefined : host;
    if (phaseName !== undefined || phases.length === 0) {
      phases.push({ id: newId(), name: phaseName ?? host, columns: [], collapsed: false });
    }
    const phaseIndex = phases.length - 1;
    const columnIndex = phases[phaseIndex].columns.length;

    const renamed = !!step.title && step.title !== step.pageTitle;
    const title = renamed ? step.title : ai?.stepName || step.title || host;
    phases[phaseIndex].columns.push({ id: newId(), name: title, image: step.screenshotUrl });

    const link = { id: newId(), type: "link" as const, url: step.url, title: step.url };
    blocks.push(
      ai?.touchpoint
        ? block("touchpoint", ai.touchpoint, phaseIndex, columnIndex, { attachments: [link], notes: AI_NOTE, aiDraft: true })
        : block("touchpoint", title, phaseIndex, columnIndex, { attachments: [link] }),
    );
    if (step.note) blocks.push(block("note", step.note, phaseIndex, columnIndex));
    for (const friction of ai?.frictions ?? []) {
      blocks.push(block("friction", friction, phaseIndex, columnIndex, { notes: AI_NOTE, aiDraft: true }));
    }
    for (const question of ai?.questions ?? []) {
      blocks.push(block("question", question, phaseIndex, columnIndex, { notes: AI_NOTE, aiDraft: true }));
    }
  });
  return { phases, blocks };
}

export function setupExtensionRoutes(app: Express) {
  // ── Token management (signed-in users, from Settings) ──────────────────────

  app.get("/api/extension/tokens", async (req, res) => {
    const userId = sessionUserId(req);
    if (!userId) return res.status(401).json({ error: true, message: "Not authenticated" });
    const rows = await db
      .select({ id: apiTokens.id, name: apiTokens.name, createdAt: apiTokens.createdAt, lastUsedAt: apiTokens.lastUsedAt })
      .from(apiTokens)
      .where(eq(apiTokens.userId, userId))
      .orderBy(desc(apiTokens.createdAt));
    res.json(rows);
  });

  app.post("/api/extension/tokens", async (req, res) => {
    const userId = sessionUserId(req);
    if (!userId) return res.status(401).json({ error: true, message: "Not authenticated" });
    const name = typeof req.body?.name === "string" && req.body.name.trim()
      ? req.body.name.trim().slice(0, 100)
      : "Chrome extension";
    const token = TOKEN_PREFIX + randomBytes(32).toString("hex");
    const [row] = await db
      .insert(apiTokens)
      .values({ userId, name, tokenHash: hashToken(token) })
      .returning({ id: apiTokens.id, name: apiTokens.name, createdAt: apiTokens.createdAt });
    // The only time the token itself is ever returned
    res.json({ ...row, token });
  });

  app.delete("/api/extension/tokens/:id", async (req, res) => {
    const userId = sessionUserId(req);
    if (!userId) return res.status(401).json({ error: true, message: "Not authenticated" });
    await db.delete(apiTokens).where(and(eq(apiTokens.id, Number(req.params.id)), eq(apiTokens.userId, userId)));
    res.status(204).send();
  });

  // ── Used by the extension (bearer token) ───────────────────────────────────

  app.get("/api/extension/me", requireExtensionToken, async (req, res) => {
    const user = await storage.getUser(req.userId!);
    if (!user) return res.status(401).json({ error: true, message: "Account not found" });
    // Same projects the dashboard shows: everything in the workspace
    const projects = (await storage.getProjects(undefined, req.tenantId!)).map((p) => ({ id: p.id, name: p.name }));
    res.json({ user: { email: user.email, name: user.firstName || user.username }, projects, aiAvailable: aiDraftAvailable() });
  });

  app.post(
    "/api/extension/screenshots",
    requireExtensionToken,
    express.raw({ type: ["image/jpeg", "image/png"], limit: "8mb" }),
    async (req, res) => {
      const body = req.body;
      if (!Buffer.isBuffer(body) || body.length === 0) {
        return res.status(400).json({ error: true, message: "Send a JPEG or PNG image as the request body" });
      }
      // Check the file really is the image type it claims to be
      const isJpeg = body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff;
      const isPng = body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      if (!isJpeg && !isPng) {
        return res.status(400).json({ error: true, message: "Not a valid JPEG or PNG" });
      }
      try {
        const dir = path.join(CAPTURES_DIR, req.tenantId!);
        await fs.mkdir(dir, { recursive: true });
        // Unguessable name: /uploads is served publicly, like organization logos
        const filename = `${randomBytes(16).toString("hex")}.${isJpeg ? "jpg" : "png"}`;
        await fs.writeFile(path.join(dir, filename), body);
        res.json({ url: `/uploads/captures/${req.tenantId}/${filename}` });
      } catch (err) {
        console.error("[Extension] Saving screenshot failed:", err);
        res.status(500).json({ error: true, message: "Could not save screenshot" });
      }
    },
  );

  app.post("/api/extension/boards", requireExtensionToken, async (req, res) => {
    const parsed = createBoardSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: true, message: parsed.error.errors[0].message });
    }
    const { name, projectId, steps, aiDraft } = parsed.data;

    try {
      if (projectId !== undefined) {
        const project = await storage.getProject(projectId);
        if (!project || project.organizationId !== req.tenantId) {
          return res.status(404).json({ error: true, message: "Project not found" });
        }
      }

      // A failed draft never blocks the board: it's created without one and
      // the extension shows why
      let draft: FlowDraft | undefined;
      let ai: { status: "off" | "done" | "failed"; message?: string } = { status: "off" };
      if (aiDraft) {
        try {
          draft = await draftFlow(steps);
          ai = { status: "done" };
        } catch (err) {
          console.error("[Extension] AI draft failed:", err);
          ai = { status: "failed", message: err instanceof AiDraftError ? err.message : "Something went wrong" };
        }
      }

      const { phases, blocks } = buildBoard(steps, draft);
      const sites = Array.from(new Set(steps.map((s) => hostOf(s.url))));
      const board = await storage.createBoard({
        name,
        description: `Captured from ${sites.join(", ")} with the Blupi Chrome extension`,
        status: "draft",
        projectId,
        phases,
        blocks,
        userId: req.userId!,
        organizationId: req.tenantId,
      });
      res.json({ id: board.id, url: `/board/${board.id}`, aiDraft: ai });
    } catch (err) {
      console.error("[Extension] Creating board failed:", err);
      res.status(500).json({ error: true, message: "Could not create board" });
    }
  });
}
