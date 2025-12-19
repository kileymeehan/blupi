import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { userOrganizations } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      userId?: number;
    }
  }
}

export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionUserId = (req.session as any)?.userId;
    let userId: number | undefined;
    
    if (sessionUserId) {
      userId = typeof sessionUserId === 'number' ? sessionUserId : parseInt(sessionUserId);
      if (isNaN(userId)) {
        userId = undefined;
      }
    }
    
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
