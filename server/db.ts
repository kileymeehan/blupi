import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Validate DATABASE_URL environment variable
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is not set. Make sure to provision a database and set the DATABASE_URL."
  );
}

// Initialize the connection pool
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000 // 5 second timeout
});

// Test the connection
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Initialize Drizzle with the pool
const db = drizzle(pool, { schema });

console.log('Database connection established successfully');

export { pool, db };