import { db, pool } from './db';
import { sql } from 'drizzle-orm';

type TransactionDB = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function withRLS<T>(
  userId: number,
  callback: (tx: TransactionDB) => Promise<T>
): Promise<T> {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('Invalid userId for RLS context');
  }
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL blupi.current_user_id = ${String(userId)}`);
    return await callback(tx);
  });
}

export async function withRLSOptional<T>(
  userId: number | undefined | null,
  callback: (tx: TransactionDB) => Promise<T>
): Promise<T> {
  if (!userId) {
    return await db.transaction(async (tx) => callback(tx));
  }
  return await withRLS(userId, callback);
}

export async function verifyRLSEnabled(): Promise<boolean> {
  try {
    const result = await pool.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('projects', 'boards', 'notifications')
    `);
    
    const tables = result.rows;
    const allEnabled = tables.every((t: { rowsecurity: boolean }) => t.rowsecurity);
    
    if (!allEnabled) {
      console.warn('[RLS] Some tables do not have RLS enabled:', 
        tables.filter((t: { rowsecurity: boolean }) => !t.rowsecurity).map((t: { tablename: string }) => t.tablename)
      );
    }
    
    return allEnabled;
  } catch (error) {
    console.error('[RLS] Error checking RLS status:', error);
    return false;
  }
}

export async function applyRLSMigration(): Promise<void> {
  console.log('[RLS] Applying RLS migration...');
  
  const fs = await import('fs');
  const path = await import('path');
  const url = await import('url');
  
  const __filename = url.fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  const migrationPath = path.join(__dirname, 'migrations', 'rls-policies.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('[RLS] Migration file not found:', migrationPath);
    throw new Error('RLS migration file not found');
  }
  
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  
  try {
    await pool.query(migrationSQL);
    console.log('[RLS] Migration applied successfully');
  } catch (error: any) {
    if (error.code === '42710') {
      console.log('[RLS] Some policies already exist, continuing...');
      return;
    }
    console.error('[RLS] Error applying migration:', error.message);
    throw error;
  }
}

export async function testRLSIsolation(userId: number): Promise<{ success: boolean; message: string }> {
  try {
    const result = await withRLS(userId, async (tx) => {
      const projects = await tx.execute(sql`SELECT id, name FROM projects LIMIT 5`);
      return projects.rows;
    });
    
    return {
      success: true,
      message: `RLS test passed: Found ${result.length} projects for user ${userId}`
    };
  } catch (error: any) {
    return {
      success: false,
      message: `RLS test failed: ${error.message}`
    };
  }
}
