import { neon, Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleServerless } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";
import ws from 'ws';

// Validate DATABASE_URL environment variable
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is not set. Make sure to provision a database and set the DATABASE_URL."
  );
}

// Configure Neon for server-side WebSocket support (required for Pool)
neonConfig.webSocketConstructor = ws;
neonConfig.fetchConnectionCache = true;

// Create connection pool for transaction support (needed for RLS and sessions)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create drizzle instance with pool for transaction support
const db = drizzleServerless(pool, { schema });

// Also export the HTTP-based sql for simple queries
const sql = neon(process.env.DATABASE_URL);

export { sql, pool, db };

// Simple connection test without blocking startup
async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1 as test');
    client.release();
    console.log('[DB] Database connection pool established successfully');
    console.log('[DB] Transaction support enabled for RLS');
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