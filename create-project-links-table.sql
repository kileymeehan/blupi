-- Documents & links pinned to a project (shared/schema.ts: projectLinks).
-- Safe to run more than once. Use this instead of `npm run db:push` where
-- drizzle-kit misreads Postgres 18's named NOT NULL constraints and fails.

CREATE TABLE IF NOT EXISTS "project_links" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer NOT NULL,
  "title" text NOT NULL,
  "url" text NOT NULL,
  "type" text DEFAULT 'link' NOT NULL,
  "created_by" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "project_links" ADD CONSTRAINT "project_links_project_id_projects_id_fk"
    FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "project_links" ADD CONSTRAINT "project_links_created_by_users_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
