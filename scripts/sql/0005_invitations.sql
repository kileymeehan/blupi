-- Invitations to a workspace, optionally straight into one of its projects
-- (shared/schema.ts: pendingInvitations.projectId, projectRole, acceptedBy).
-- Safe to run more than once. Apply with scripts/apply-sql.mjs (see RAILWAY_SETUP.md section 7).

ALTER TABLE "pending_invitations" ADD COLUMN IF NOT EXISTS "project_id" integer;
ALTER TABLE "pending_invitations" ADD COLUMN IF NOT EXISTS "project_role" text;
ALTER TABLE "pending_invitations" ADD COLUMN IF NOT EXISTS "accepted_by" integer;

DO $$ BEGIN
  ALTER TABLE "pending_invitations" ADD CONSTRAINT "pending_invitations_project_id_projects_id_fk"
    FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "pending_invitations" ADD CONSTRAINT "pending_invitations_accepted_by_users_id_fk"
    FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Links created before this change used guessable tokens and never granted
-- workspace access when accepted. Retire them; owners can send new invites.
-- New tokens start with "inv_", so re-running this never touches them.
UPDATE "pending_invitations" SET "status" = 'expired'
  WHERE "status" = 'pending' AND "token" NOT LIKE 'inv\_%';
