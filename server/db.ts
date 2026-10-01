import pg from 'pg';
const { Pool } = pg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is not set. Make sure to provision a database and set the DATABASE_URL."
  );
}

// node-postgres checks a dedicated client out of the pool for the duration of
// db.transaction(), so SET LOCAL (used by withRLS in server/rls.ts) persists
// across the queries inside that callback — same transaction guarantee the
// Neon serverless Pool driver provided, without the Neon-specific websocket
// dependency.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const db = drizzle(pool, { schema });

// Thin wrapper so storage.ts can do: sql(query, params) → rows[]
export const sql = async (query: string, params?: unknown[]) => {
  const result = await pool.query(query, params);
  return result.rows;
};

async function testConnection() {
  try {
    await pool.query('SELECT 1 as test');
    console.log('[DB] Database connection pool established successfully');
    console.log('[DB] Transaction support enabled for RLS');
    return true;
  } catch (error) {
    console.error('[DB] Connection test failed:', (error as Error).message);
    console.log('[DB] App will continue with limited functionality');
    return false;
  }
}

testConnection().catch(err => {
  console.error('[DB] Startup connection test failed:', err.message);
});

export { db };
