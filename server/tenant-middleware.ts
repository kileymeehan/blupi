import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { userOrganizations, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      userId?: number;
    }
  }
}

async function resolveUserIdFromSession(sessionUserId: string | number): Promise<number | null> {
  if (typeof sessionUserId === 'number') {
    return sessionUserId;
  }
  
  if (typeof sessionUserId === 'string') {
    if (sessionUserId.startsWith('google_') || sessionUserId.startsWith('user_')) {
      const [user] = await db.select().from(users).where(eq(users.firebaseUid, sessionUserId)).limit(1);
      return user?.id || null;
    }
    const parsed = parseInt(sessionUserId, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  
  return null;
}

export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionUserId = (req.session as any)?.userId;
    
    if (!sessionUserId) {
      return next();
    }

    const userId = await resolveUserIdFromSession(sessionUserId);
    
    if (!userId) {
      return next();
    }

    req.userId = userId;

    const activeOrg = await db
      .select()
      .from(userOrganizations)
      .where(
        and(
          eq(userOrganizations.userId, userId),
          eq(userOrganizations.isActive, true)
        )
      )
      .limit(1);

    if (activeOrg.length > 0) {
      req.tenantId = activeOrg[0].organizationId;
    }

    next();
  } catch (error) {
    console.error('[Tenant Middleware] Error extracting tenant:', error);
    next();
  }
}

export function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.tenantId) {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'No organization context. Please select an organization.' 
    });
  }
  next();
}

export function validateTenantAccess(resourceOrgId: string | null | undefined) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!resourceOrgId) {
      return next();
    }
    
    if (req.tenantId && req.tenantId !== resourceOrgId) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'You do not have access to this resource.' 
      });
    }
    next();
  };
}

export async function setActiveOrganization(userId: number, organizationId: string): Promise<boolean> {
  try {
    await db
      .update(userOrganizations)
      .set({ isActive: false })
      .where(eq(userOrganizations.userId, userId));

    const result = await db
      .update(userOrganizations)
      .set({ isActive: true })
      .where(
        and(
          eq(userOrganizations.userId, userId),
          eq(userOrganizations.organizationId, organizationId)
        )
      );

    return true;
  } catch (error) {
    console.error('[Tenant] Error setting active organization:', error);
    return false;
  }
}
