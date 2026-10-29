-- Current/future state for boards (shared/schema.ts: boards.state, boards.basedOnBoardId).
-- Safe to run more than once. Apply with scripts/apply-sql.mjs (see RAILWAY_SETUP.md section 7).

ALTER TABLE "boards" ADD COLUMN IF NOT EXISTS "state" text DEFAULT 'current' NOT NULL;
ALTER TABLE "boards" ADD COLUMN IF NOT EXISTS "based_on_board_id" integer;

DO $$ BEGIN
  ALTER TABLE "boards" ADD CONSTRAINT "boards_based_on_board_id_boards_id_fk"
    FOREIGN KEY ("based_on_board_id") REFERENCES "public"."boards"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
