// Runs a SQL file against DATABASE_URL in a single transaction.
//
//   DATABASE_URL="<Railway DATABASE_PUBLIC_URL>" node scripts/apply-sql.mjs scripts/sql/0001_api_tokens.sql
//
// Used instead of `npm run db:push` for production schema changes: this
// drizzle-kit version misreads newer Postgres "not null" constraints and
// plans to drop them across every table.

import { readFileSync } from "fs";
import pg from "pg";

const [file] = process.argv.slice(2);
if (!process.env.DATABASE_URL || !file) {
  console.error('Usage: DATABASE_URL="..." node scripts/apply-sql.mjs <file.sql>');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();
  const { rows: [{ server_version }] } = await client.query("SHOW server_version");
  console.log(`Connected (Postgres ${server_version}). Applying ${file}...`);
  await client.query("BEGIN");
  await client.query(readFileSync(file, "utf8"));
  await client.query("COMMIT");
  console.log("Done.");
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Failed, nothing was changed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
