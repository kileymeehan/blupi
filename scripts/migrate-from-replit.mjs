// One-time copy of Blupi data from the old Replit database into Railway.
//
// Keeps:    organizations, projects, boards, sheet documents
// Drops:    every user account, plus anything tied to a specific person
//           (memberships, invitations, notifications, comments, flagged blocks,
//           board permissions, sessions)
// Reassigns all copied projects and boards to a single new owner account.
//
// Usage (dry run by default; prints what it would do):
//   SOURCE_DATABASE_URL="<old Replit DATABASE_URL>" \
//   DATABASE_URL="<Railway DATABASE_PUBLIC_URL>" \
//   OWNER_EMAIL="you@example.com" \
//   node scripts/migrate-from-replit.mjs [--apply]
//
// Optional: OWNER_PASSWORD="..." to also allow email/password sign-in.
// Without it, sign in with Google using OWNER_EMAIL.
//
// Run `npm run db:push` against the Railway database first so the tables exist.

import pg from "pg";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const APPLY = process.argv.includes("--apply");
const { SOURCE_DATABASE_URL, DATABASE_URL, OWNER_PASSWORD } = process.env;
const OWNER_EMAIL = process.env.OWNER_EMAIL?.trim().toLowerCase();

if (!SOURCE_DATABASE_URL || !DATABASE_URL || !OWNER_EMAIL) {
  console.error("Set SOURCE_DATABASE_URL, DATABASE_URL and OWNER_EMAIL. See the top of this file.");
  process.exit(1);
}
if (SOURCE_DATABASE_URL === DATABASE_URL) {
  console.error("SOURCE_DATABASE_URL and DATABASE_URL are the same database. Refusing to run.");
  process.exit(1);
}
if (OWNER_PASSWORD !== undefined && OWNER_PASSWORD.length < 8) {
  console.error("OWNER_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

// Neon (Replit) needs SSL; Railway's public URL accepts it too
const connect = (url) =>
  new pg.Client({ connectionString: url, ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : { rejectUnauthorized: false } });

// Copied in this order so foreign keys resolve. `owner` lists user-ID columns
// that get rewritten to the new owner account.
const TABLES = [
  { name: "organizations", owner: [] },
  { name: "projects", owner: ["user_id"] },
  { name: "boards", owner: ["user_id"] },
  { name: "sheet_documents", owner: [] },
  { name: "project_sheet_documents", owner: [] },
];

const DROPPED = [
  "users", "user_organizations", "project_members", "board_permissions", "team_members",
  "pending_invitations", "notifications", "board_comments", "flagged_blocks", "session",
];

async function tableExists(client, table) {
  const { rows } = await client.query(
    "select 1 from information_schema.tables where table_schema = 'public' and table_name = $1",
    [table]
  );
  return rows.length > 0;
}

async function columnTypes(client, table) {
  const { rows } = await client.query(
    "select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = $1",
    [table]
  );
  return new Map(rows.map((r) => [r.column_name, r.data_type]));
}

async function count(client, table) {
  if (!(await tableExists(client, table))) return null;
  const { rows } = await client.query(`select count(*)::int as n from "${table}"`);
  return rows[0].n;
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await promisify(scrypt)(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

const source = connect(SOURCE_DATABASE_URL);
const target = connect(DATABASE_URL);
await source.connect();
await target.connect();

try {
  // ── Safety checks on the target ──────────────────────────────────────────
  for (const t of [...TABLES.map((t) => t.name), "users", "user_organizations"]) {
    if (!(await tableExists(target, t))) {
      throw new Error(`Railway database has no "${t}" table. Run \`npm run db:push\` against it first.`);
    }
  }
  const existingProjects = await count(target, "projects");
  const existingBoards = await count(target, "boards");
  if (existingProjects || existingBoards) {
    throw new Error(
      `Railway database already has ${existingProjects} projects and ${existingBoards} boards. ` +
      "This script only runs against an empty database so nothing gets duplicated."
    );
  }

  // ── Report ───────────────────────────────────────────────────────────────
  console.log(APPLY ? "\nMigrating (for real)\n" : "\nDRY RUN — nothing will be written. Re-run with --apply to migrate.\n");
  console.log("Will copy:");
  for (const t of TABLES) {
    const n = await count(source, t.name);
    console.log(`  ${t.name.padEnd(26)} ${n === null ? "(not in old database)" : n}`);
  }
  console.log("\nWill NOT copy:");
  for (const t of DROPPED) {
    const n = await count(source, t);
    if (n !== null) console.log(`  ${t.padEnd(26)} ${n}`);
  }
  const existingOwner = (await target.query("select id from users where lower(email) = $1", [OWNER_EMAIL])).rows[0];
  console.log(`\nAll projects and boards will belong to: ${OWNER_EMAIL}${existingOwner ? " (existing account)" : " (new account)"}`);

  if (!APPLY) process.exit(0);

  // ── Copy ─────────────────────────────────────────────────────────────────
  await target.query("begin");

  let ownerId = existingOwner?.id;
  if (!ownerId) {
    const base = OWNER_EMAIL.split("@")[0].replace(/[^a-zA-Z0-9._-]/g, "") || "owner";
    const username = (await target.query("select 1 from users where username = $1", [base])).rows.length
      ? `${base}${randomBytes(2).toString("hex")}`
      : base;
    const password = OWNER_PASSWORD ? await hashPassword(OWNER_PASSWORD) : "";
    ownerId = (
      await target.query(
        "insert into users (email, username, password) values ($1, $2, $3) returning id",
        [OWNER_EMAIL, username, password]
      )
    ).rows[0].id;
  } else if (OWNER_PASSWORD) {
    await target.query("update users set password = $1 where id = $2", [await hashPassword(OWNER_PASSWORD), ownerId]);
  }

  for (const t of TABLES) {
    if (!(await tableExists(source, t.name))) continue;
    const sourceCols = await columnTypes(source, t.name);
    const targetCols = await columnTypes(target, t.name);
    const cols = [...sourceCols.keys()].filter((c) => targetCols.has(c));
    const skipped = [...sourceCols.keys()].filter((c) => !targetCols.has(c));
    if (skipped.length) console.log(`  ${t.name}: ignoring old columns ${skipped.join(", ")}`);

    const { rows } = await source.query(`select * from "${t.name}"`);
    const colList = cols.map((c) => `"${c}"`).join(", ");
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    for (const row of rows) {
      const values = cols.map((c) => {
        if (t.owner.includes(c)) return ownerId;
        const v = row[c];
        // node-postgres would send JS arrays as Postgres arrays; jsonb needs JSON text
        const type = targetCols.get(c);
        if (v !== null && (type === "jsonb" || type === "json")) return JSON.stringify(v);
        return v;
      });
      await target.query(`insert into "${t.name}" (${colList}) values (${placeholders})`, values);
    }
    console.log(`  ${t.name}: copied ${rows.length}`);
  }

  // Projects/boards from before workspaces existed have no organization, and the
  // app only shows items inside one. Put them in a workspace for the owner.
  const orphans = (
    await target.query(
      "select (select count(*) from projects where organization_id is null)::int as p, (select count(*) from boards where organization_id is null)::int as b"
    )
  ).rows[0];
  if (orphans.p || orphans.b) {
    const org = (
      await target.query(
        "insert into organizations (name, slug) values ($1, $2) returning id",
        ["My Workspace", `workspace-${randomBytes(3).toString("hex")}`]
      )
    ).rows[0];
    await target.query("update projects set organization_id = $1 where organization_id is null", [org.id]);
    await target.query("update boards set organization_id = $1 where organization_id is null", [org.id]);
    console.log(`  moved ${orphans.p} projects and ${orphans.b} boards without a workspace into "My Workspace"`);
  }

  // Owner joins every workspace; the one with the most projects becomes active
  const orgs = (
    await target.query(
      "select o.id from organizations o left join projects p on p.organization_id = o.id group by o.id order by count(p.id) desc"
    )
  ).rows;
  for (const [i, org] of orgs.entries()) {
    await target.query(
      `insert into user_organizations (user_id, organization_id, role, is_active)
       select $1, $2, 'owner', $3
       where not exists (select 1 from user_organizations where user_id = $1 and organization_id = $2)`,
      [ownerId, org.id, i === 0]
    );
  }
  console.log(`  ${OWNER_EMAIL} added as owner of ${orgs.length} workspace(s)`);

  // Copied rows kept their IDs; move each ID counter past the highest one
  for (const t of ["projects", "boards", "users", "user_organizations"]) {
    await target.query(
      `select setval(pg_get_serial_sequence('"${t}"', 'id'), coalesce((select max(id) from "${t}"), 0) + 1, false)`
    );
  }

  await target.query("commit");
  console.log("\nDone.");
} catch (err) {
  await target.query("rollback").catch(() => {});
  console.error(`\nMigration failed, nothing was written: ${err.message}`);
  process.exitCode = 1;
} finally {
  await source.end();
  await target.end();
}
