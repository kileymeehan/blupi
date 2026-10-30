import type { Express, Request, Response } from "express";
import { randomBytes } from "crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { storage } from "./storage";
import { requireTenant } from "./tenant-middleware";
import { emailConfigured, sendInviteEmail } from "./email-service";
import {
  organizations, pendingInvitations, projectMembers, projects, userOrganizations, users,
  type PendingInvitation, type User,
} from "@shared/schema";

// Workspace membership and invitations.
//
// Access to a workspace comes from user_organizations, so that's the one list
// of members. An invitation is a single-use link, optionally into a project
// too. The link is what matters: inviters can copy it, and it's emailed
// automatically when an email provider is configured.

const INVITE_DAYS = 7;
const WORKSPACE_ROLES = ["admin", "member"] as const;
const PROJECT_ROLES = ["member", "editor", "admin"] as const;
const MANAGER_ROLES = ["owner", "admin"];

const newToken = () => `inv_${randomBytes(32).toString("base64url")}`;
const normalizeEmail = (email: string) => email.trim().toLowerCase();

function displayName(user: Pick<User, "firstName" | "lastName" | "username" | "email">) {
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return full || user.username || user.email.split("@")[0];
}

function sessionUserId(req: Request): number | null {
  const id = parseInt(String(req.session?.userId ?? ""), 10);
  return isNaN(id) ? null : id;
}

// Links use the address people reached the app on (or APP_URL if set)
function appUrl(req: Request) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const proto = (req.get("x-forwarded-proto") || req.protocol).split(",")[0].trim();
  return `${proto}://${req.get("host")}`;
}
const inviteUrl = (req: Request, token: string) => `${appUrl(req)}/invite/${token}`;

function statusOf(inv: PendingInvitation) {
  if (inv.status === "pending" && new Date(inv.expiresAt) < new Date()) return "expired";
  return inv.status as "pending" | "accepted" | "expired" | "revoked";
}

async function roleIn(userId: number, organizationId: string) {
  const [row] = await db
    .select({ role: userOrganizations.role })
    .from(userOrganizations)
    .where(and(eq(userOrganizations.userId, userId), eq(userOrganizations.organizationId, organizationId)));
  return row?.role ?? null;
}

// Signed in, in a workspace, and an owner or admin of it
async function requireManager(req: Request, res: Response) {
  const userId = sessionUserId(req);
  if (!userId) {
    res.status(401).json({ error: true, message: "Authentication required" });
    return null;
  }
  const role = await roleIn(userId, req.tenantId!);
  if (!role || !MANAGER_ROLES.includes(role)) {
    res.status(403).json({ error: true, message: "Only workspace owners and admins can do this" });
    return null;
  }
  return { userId, role };
}

async function addToProject(projectId: number, userId: number, role: string) {
  const [existing] = await db
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
  if (existing) return false;
  await db.insert(projectMembers).values({ projectId, userId, role, status: "active" });
  return true;
}

const createBody = z.object({
  email: z.string().trim().email("Enter a valid email address").max(320),
  role: z.enum(WORKSPACE_ROLES).default("member"),
  projectId: z.number().int().optional(),
  projectRole: z.enum(PROJECT_ROLES).default("editor"),
});

export function setupInvitationRoutes(app: Express) {
  // ---------- workspace members ----------

  app.get("/api/workspace/members", requireTenant, async (req, res) => {
    try {
      const userId = sessionUserId(req);
      const myRole = userId ? await roleIn(userId, req.tenantId!) : null;
      if (!myRole) return res.status(403).json({ error: true, message: "You are not a member of this workspace" });

      const rows = await db
        .select({ membership: userOrganizations, user: users })
        .from(userOrganizations)
        .innerJoin(users, eq(userOrganizations.userId, users.id))
        .where(eq(userOrganizations.organizationId, req.tenantId!))
        .orderBy(userOrganizations.joinedAt);
      const members = rows.map(({ membership, user }) => ({
        userId: user.id,
        name: displayName(user),
        email: user.email,
        role: membership.role,
        joinedAt: membership.joinedAt,
        isYou: user.id === userId,
      }));
      res.json({ members, myRole });
    } catch (err) {
      console.error("[Invitations] Listing members failed:", err);
      res.status(500).json({ error: true, message: "Failed to load members" });
    }
  });

  app.patch("/api/workspace/members/:userId", requireTenant, async (req, res) => {
    try {
      const manager = await requireManager(req, res);
      if (!manager) return;
      const targetId = Number(req.params.userId);
      const role = req.body?.role;
      if (!WORKSPACE_ROLES.includes(role)) {
        return res.status(400).json({ error: true, message: "Role must be admin or member" });
      }
      if (targetId === manager.userId) {
        return res.status(400).json({ error: true, message: "You can't change your own role" });
      }
      const current = await roleIn(targetId, req.tenantId!);
      if (!current) return res.status(404).json({ error: true, message: "Member not found" });
      if (current === "owner") return res.status(400).json({ error: true, message: "The owner's role can't be changed" });

      await db
        .update(userOrganizations)
        .set({ role })
        .where(and(eq(userOrganizations.userId, targetId), eq(userOrganizations.organizationId, req.tenantId!)));
      res.json({ success: true });
    } catch (err) {
      console.error("[Invitations] Changing role failed:", err);
      res.status(500).json({ error: true, message: "Failed to change role" });
    }
  });

  // Owners/admins remove people; anyone except the owner can remove themselves (leave)
  app.delete("/api/workspace/members/:userId", requireTenant, async (req, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) return res.status(401).json({ error: true, message: "Authentication required" });
      const targetId = Number(req.params.userId);
      const orgId = req.tenantId!;
      const leaving = targetId === userId;
      if (!leaving && !(await requireManager(req, res))) return;

      const targetRole = await roleIn(targetId, orgId);
      if (!targetRole) return res.status(404).json({ error: true, message: "Member not found" });
      if (targetRole === "owner") {
        return res.status(400).json({ error: true, message: "The workspace owner can't be removed" });
      }

      await db.transaction(async (tx) => {
        const orgProjects = (await tx.select({ id: projects.id }).from(projects).where(eq(projects.organizationId, orgId))).map((p) => p.id);
        if (orgProjects.length) {
          await tx.delete(projectMembers).where(and(eq(projectMembers.userId, targetId), inArray(projectMembers.projectId, orgProjects)));
        }
        await tx.delete(userOrganizations).where(and(eq(userOrganizations.userId, targetId), eq(userOrganizations.organizationId, orgId)));
        // If this was their active workspace, switch them to another one
        const remaining = await tx.select().from(userOrganizations).where(eq(userOrganizations.userId, targetId));
        if (remaining.length && !remaining.some((m) => m.isActive)) {
          await tx.update(userOrganizations).set({ isActive: true }).where(eq(userOrganizations.id, remaining[0].id));
        }
      });
      res.json({ success: true });
    } catch (err) {
      console.error("[Invitations] Removing member failed:", err);
      res.status(500).json({ error: true, message: "Failed to remove member" });
    }
  });

  // ---------- invitations (owners/admins) ----------

  app.get("/api/invitations", requireTenant, async (req, res) => {
    try {
      if (!(await requireManager(req, res))) return;
      const rows = await db
        .select({ invitation: pendingInvitations, projectName: projects.name })
        .from(pendingInvitations)
        .leftJoin(projects, eq(pendingInvitations.projectId, projects.id))
        .where(and(
          eq(pendingInvitations.organizationUuid, req.tenantId!),
          eq(pendingInvitations.status, "pending"),
          sql`${pendingInvitations.token} like 'inv\\_%'`,
        ))
        .orderBy(desc(pendingInvitations.createdAt));
      res.json(rows.map(({ invitation, projectName }) => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        projectId: invitation.projectId,
        projectName,
        projectRole: invitation.projectRole,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
        status: statusOf(invitation),
        url: inviteUrl(req, invitation.token),
      })));
    } catch (err) {
      console.error("[Invitations] Listing invitations failed:", err);
      res.status(500).json({ error: true, message: "Failed to load invitations" });
    }
  });

  app.post("/api/invitations", requireTenant, async (req, res) => {
    try {
      const manager = await requireManager(req, res);
      if (!manager) return;
      const parsed = createBody.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: true, message: parsed.error.errors[0].message });
      const email = normalizeEmail(parsed.data.email);
      const { role, projectId, projectRole } = parsed.data;
      const orgId = req.tenantId!;

      const project = projectId !== undefined ? await storage.getProject(projectId, orgId) : null;
      if (projectId !== undefined && !project) return res.status(404).json({ error: true, message: "Project not found" });

      // Already in the workspace: add them to the project directly, no invite needed
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser && (await roleIn(existingUser.id, orgId))) {
        if (!project) return res.status(409).json({ error: true, message: `${email} is already in this workspace` });
        const added = await addToProject(project.id, existingUser.id, projectRole);
        return res.json({ type: "added", alreadyOnProject: !added });
      }

      const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
      const inviter = await storage.getUser(manager.userId);
      const fields = {
        role,
        projectId: project?.id ?? null,
        projectRole: project ? projectRole : null,
        teamName: org?.name ?? "a Blupi workspace",
        inviterName: inviter ? displayName(inviter) : "A teammate",
        invitedBy: manager.userId,
        expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
      };

      // One open invitation per person per workspace: update it rather than pile up links
      const [open] = await db
        .select()
        .from(pendingInvitations)
        .where(and(
          eq(pendingInvitations.organizationUuid, orgId),
          eq(pendingInvitations.email, email),
          eq(pendingInvitations.status, "pending"),
          sql`${pendingInvitations.token} like 'inv\\_%'`,
        ));
      const [invitation] = open
        ? await db.update(pendingInvitations).set(fields).where(eq(pendingInvitations.id, open.id)).returning()
        : await db.insert(pendingInvitations).values({ ...fields, email, token: newToken(), organizationUuid: orgId, status: "pending" }).returning();

      const url = inviteUrl(req, invitation.token);
      if (existingUser) {
        await storage.createNotification({
          userId: existingUser.id,
          type: "team_invitation",
          title: "Workspace invitation",
          message: `${fields.inviterName} invited you to join ${fields.teamName}${project ? ` and the project "${project.name}"` : ""}.`,
          actionUrl: `/invite/${invitation.token}`,
          read: false,
          createdBy: manager.userId,
        });
      }
      const emailSent = await sendInviteEmail({
        toEmail: email,
        inviterName: fields.inviterName,
        workspaceName: fields.teamName,
        projectName: project?.name,
        inviteUrl: url,
      });

      res.json({ type: "invited", id: invitation.id, url, emailSent, emailConfigured: emailConfigured() });
    } catch (err) {
      console.error("[Invitations] Creating invitation failed:", err);
      res.status(500).json({ error: true, message: "Failed to create invitation" });
    }
  });

  // New link and a fresh 7 days (the old link stops working)
  app.post("/api/invitations/:id/renew", requireTenant, async (req, res) => {
    try {
      if (!(await requireManager(req, res))) return;
      const [invitation] = await db
        .update(pendingInvitations)
        .set({ token: newToken(), status: "pending", expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000) })
        .where(and(
          eq(pendingInvitations.id, Number(req.params.id)),
          eq(pendingInvitations.organizationUuid, req.tenantId!),
          eq(pendingInvitations.status, "pending"),
        ))
        .returning();
      if (!invitation) return res.status(404).json({ error: true, message: "Invitation not found" });
      res.json({ url: inviteUrl(req, invitation.token) });
    } catch (err) {
      console.error("[Invitations] Renewing invitation failed:", err);
      res.status(500).json({ error: true, message: "Failed to renew invitation" });
    }
  });

  app.delete("/api/invitations/:id", requireTenant, async (req, res) => {
    try {
      if (!(await requireManager(req, res))) return;
      const [revoked] = await db
        .update(pendingInvitations)
        .set({ status: "revoked" })
        .where(and(
          eq(pendingInvitations.id, Number(req.params.id)),
          eq(pendingInvitations.organizationUuid, req.tenantId!),
          eq(pendingInvitations.status, "pending"),
        ))
        .returning({ id: pendingInvitations.id });
      if (!revoked) return res.status(404).json({ error: true, message: "Invitation not found" });
      res.json({ success: true });
    } catch (err) {
      console.error("[Invitations] Revoking invitation failed:", err);
      res.status(500).json({ error: true, message: "Failed to revoke invitation" });
    }
  });

  // ---------- the invite link (no workspace context needed) ----------

  async function findByToken(token: string) {
    if (!token.startsWith("inv_")) return null;
    const [row] = await db
      .select({ invitation: pendingInvitations, projectName: projects.name })
      .from(pendingInvitations)
      .leftJoin(projects, eq(pendingInvitations.projectId, projects.id))
      .where(eq(pendingInvitations.token, token));
    return row ?? null;
  }

  app.get("/api/invite/:token", async (req, res) => {
    try {
      const row = await findByToken(req.params.token);
      if (!row) return res.status(404).json({ error: true, message: "This invitation link isn't valid" });
      const { invitation, projectName } = row;
      const status = statusOf(invitation);
      if (status !== "pending") return res.json({ status });

      const userId = sessionUserId(req);
      const signedInAs = userId ? await storage.getUser(userId) : undefined;
      const existing = await storage.getUserByEmail(invitation.email);
      res.json({
        status,
        email: invitation.email,
        workspaceName: invitation.teamName,
        inviterName: invitation.inviterName,
        role: invitation.role,
        projectName: projectName ?? null,
        accountExists: !!existing,
        signedInEmail: signedInAs?.email ?? null,
      });
    } catch (err) {
      console.error("[Invitations] Looking up invitation failed:", err);
      res.status(500).json({ error: true, message: "Failed to load invitation" });
    }
  });

  app.post("/api/invite/:token/accept", async (req, res) => {
    try {
      const userId = sessionUserId(req);
      if (!userId) return res.status(401).json({ error: true, message: "Sign in to accept this invitation" });
      const user = await storage.getUser(userId);
      const row = await findByToken(req.params.token);
      if (!user || !row) return res.status(404).json({ error: true, message: "This invitation link isn't valid" });
      const { invitation } = row;

      const status = statusOf(invitation);
      if (status !== "pending") {
        const why = { accepted: "has already been used", expired: "has expired", revoked: "was cancelled" }[status];
        return res.status(410).json({ error: true, message: `This invitation ${why}. Ask for a new one.` });
      }
      if (normalizeEmail(user.email) !== normalizeEmail(invitation.email)) {
        return res.status(403).json({ error: true, message: `This invitation is for ${invitation.email}. Sign in with that email to accept it.` });
      }

      const orgId = invitation.organizationUuid!;
      let projectId: number | null = null;
      await db.transaction(async (tx) => {
        // Claim the invitation first so it can only be used once
        const [claimed] = await tx
          .update(pendingInvitations)
          .set({ status: "accepted", acceptedAt: new Date(), acceptedBy: user.id })
          .where(and(eq(pendingInvitations.id, invitation.id), eq(pendingInvitations.status, "pending")))
          .returning({ id: pendingInvitations.id });
        if (!claimed) throw Object.assign(new Error("already used"), { status: 410 });

        const [membership] = await tx
          .select()
          .from(userOrganizations)
          .where(and(eq(userOrganizations.userId, user.id), eq(userOrganizations.organizationId, orgId)));
        if (!membership) {
          await tx.insert(userOrganizations).values({ userId: user.id, organizationId: orgId, role: invitation.role, isActive: false });
        }
        // Switch them into the workspace they just joined
        await tx.update(userOrganizations).set({ isActive: false }).where(eq(userOrganizations.userId, user.id));
        await tx.update(userOrganizations).set({ isActive: true })
          .where(and(eq(userOrganizations.userId, user.id), eq(userOrganizations.organizationId, orgId)));

        if (invitation.projectId) {
          const [project] = await tx.select({ id: projects.id }).from(projects)
            .where(and(eq(projects.id, invitation.projectId), eq(projects.organizationId, orgId)));
          if (project) {
            const [onProject] = await tx.select({ id: projectMembers.id }).from(projectMembers)
              .where(and(eq(projectMembers.projectId, project.id), eq(projectMembers.userId, user.id)));
            if (!onProject) {
              await tx.insert(projectMembers).values({
                projectId: project.id, userId: user.id, role: invitation.projectRole || "editor", status: "active",
              });
            }
            projectId = project.id;
          }
        }
      });

      await storage.createNotification({
        userId: invitation.invitedBy,
        type: "invite_accepted",
        title: "Invitation accepted",
        message: `${displayName(user)} joined ${invitation.teamName}.`,
        actionUrl: projectId ? `/project/${projectId}` : "/team",
        read: false,
        createdBy: user.id,
      }).catch((err) => console.error("[Invitations] Notifying inviter failed:", err));

      res.json({ success: true, redirect: projectId ? `/project/${projectId}` : "/" });
    } catch (err: any) {
      if (err?.status === 410) return res.status(410).json({ error: true, message: "This invitation has already been used" });
      console.error("[Invitations] Accepting invitation failed:", err);
      res.status(500).json({ error: true, message: "Failed to accept invitation" });
    }
  });
}
