import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@shared/schema";

// Validate DATABASE_URL environment variable
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is not set. Make sure to provision a database and set the DATABASE_URL."
  );
}

// Use HTTP connection instead of WebSocket to avoid connection issues
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

export { sql };

// Simple connection test without blocking startup
async function testConnection() {
  try {
    await sql`SELECT 1 as test`;
    console.log('[DB] Database connection established successfully');
    return true;
  } catch (error) {
    console.error('[DB] Connection test failed:', (error as Error).message);
    console.log('[DB] App will continue with limited functionality');
    return false;
  }
}

// Test connection on startup but don't block
testConnection().catch(err => {
  console.error('[DB] Startup connection test failed:', err.message);
});

// Create a simple pool-like interface for compatibility
const pool = {
  connect: async () => ({ query: sql, release: () => {} }),
  query: sql,
  end: () => Promise.resolve()
};

export { pool, db };