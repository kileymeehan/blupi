import type { Request, Response, NextFunction } from 'express';
import { getFeatureFlags, getEnabledFeatures, getDisabledFeatures } from './feature-flags';

interface ErrorReport {
  timestamp: string;
  error: string;
  stack?: string;
  url?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
}

class SimpleMonitoring {
  private errors: ErrorReport[] = [];
  private readonly maxErrors = 100; // Keep last 100 errors in memory

  logError(error: Error, req?: Request, userId?: string) {
    const report: ErrorReport = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      url: req?.url,
      method: req?.method,
      userAgent: req?.get('User-Agent'),
      ip: req?.ip,
      userId
    };

    this.errors.unshift(report);
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Log to console for development
    console.error('[MONITORING] Error captured:', {
      message: error.message,
      url: req?.url,
      method: req?.method,
      userId,
      timestamp: report.timestamp
    });
  }

  getRecentErrors(limit: number = 20): ErrorReport[] {
    return this.errors.slice(0, limit);
  }

  getErrorStats() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const twentyFourHours = 24 * oneHour;

    const recentErrors = this.errors.filter(error => 
      now - new Date(error.timestamp).getTime() < oneHour
    );

    const dailyErrors = this.errors.filter(error => 
      now - new Date(error.timestamp).getTime() < twentyFourHours
    );

    return {
      totalErrors: this.errors.length,
      errorsLastHour: recentErrors.length,
      errorsLast24Hours: dailyErrors.length,
      oldestError: this.errors[this.errors.length - 1]?.timestamp,
      newestError: this.errors[0]?.timestamp
    };
  }

  clearErrors() {
    this.errors = [];
  }
}

export const monitoring = new SimpleMonitoring();

// Express middleware for automatic error capture
export function errorMonitoringMiddleware(err: Error, req: Request, res: Response, next: NextFunction) {
  // Extract user ID from session if available
  const userId = req.user?.id?.toString();
  
  monitoring.logError(err, req, userId);
  next(err);
}

// Health check endpoint data
export function getHealthStatus() {
  const errorStats = monitoring.getErrorStats();
  const featureFlags = getFeatureFlags();
  
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    errors: errorStats,
    features: {
      enabled: getEnabledFeatures(),
      disabled: getDisabledFeatures(),
      flags: featureFlags
    }
  };
}