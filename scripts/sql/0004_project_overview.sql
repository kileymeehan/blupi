-- Longer project description ("goals, scope, objectives") from the project page
-- (shared/schema.ts: projects.overview).
-- Safe to run more than once. Apply with scripts/apply-sql.mjs (see RAILWAY_SETUP.md section 7).

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "overview" text;
