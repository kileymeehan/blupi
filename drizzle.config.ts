import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Sign-in sessions live in a "session" table managed by connect-pg-simple,
  // not by this schema. Without this, db:push offers to drop or rename it.
  tablesFilter: ["!session"],
});
