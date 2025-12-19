import { db, pool } from '../db';
import { organizations, userOrganizations, projects, boards, teamMembers, pendingInvitations, users } from '@shared/schema';
import { eq, isNull } from 'drizzle-orm';

export async function runMultiTenantMigration() {
  console.log('[Migration] Starting multi-tenant data migration...');
  
  try {
    const existingOrgs = await db.select().from(organizations).limit(1);
    
    let defaultOrgId: string;
    
    if (existingOrgs.length === 0) {
      console.log('[Migration] Creating default organization...');
      const [newOrg] = await db
        .insert(organizations)
        .values({
          name: 'Default Organization',
          slug: 'default',
          settings: { allowPublicBoards: true }
        })
        .returning();
      
      defaultOrgId = newOrg.id;
      console.log('[Migration] Created default organization:', defaultOrgId);
    } else {
      defaultOrgId = existingOrgs[0].id;
      console.log('[Migration] Using existing organization:', defaultOrgId);
    }

    console.log('[Migration] Updating projects without organization...');
    await db
      .update(projects)
      .set({ organizationId: defaultOrgId })
      .where(isNull(projects.organizationId));

    console.log('[Migration] Updating boards without organization...');
    await db
      .update(boards)
      .set({ organizationId: defaultOrgId })
      .where(isNull(boards.organizationId));

    console.log('[Migration] Setting up user-organization memberships...');
    const allUsers = await db.select({ id: users.id }).from(users);
    
    for (const user of allUsers) {
      const existingMembership = await db
        .select()
        .from(userOrganizations)
        .where(eq(userOrganizations.userId, user.id))
        .limit(1);
      
      if (existingMembership.length === 0) {
        await db.insert(userOrganizations).values({
          userId: user.id,
          organizationId: defaultOrgId,
          role: 'member',
          isActive: true
        });
      }
    }

    console.log('[Migration] Updating team_members organization references...');
    await pool.query(`
      UPDATE team_members 
      SET organization_uuid = $1 
      WHERE organization_uuid IS NULL
    `, [defaultOrgId]);

    console.log('[Migration] Updating pending_invitations organization references...');
    await pool.query(`
      UPDATE pending_invitations 
      SET organization_uuid = $1 
      WHERE organization_uuid IS NULL
    `, [defaultOrgId]);

    console.log('[Migration] Multi-tenant data migration completed successfully!');
    return { success: true, defaultOrgId };
    
  } catch (error) {
    console.error('[Migration] Error during multi-tenant migration:', error);
    throw error;
  }
}
