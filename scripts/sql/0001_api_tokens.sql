-- Chrome extension tokens (shared/schema.ts → apiTokens).
-- Safe to run more than once. Constraint names match what drizzle-kit generates.
CREATE TABLE IF NOT EXISTS "api_tokens" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "name" text NOT NULL,
  "token_hash" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "last_used_at" timestamp,
  CONSTRAINT "api_tokens_token_hash_unique" UNIQUE("token_hash"),
  CONSTRAINT "api_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);
