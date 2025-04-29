/**
 * Pendo API utility functions with OAuth authentication
 */
import axios from 'axios';

// Pendo API base URL
const PENDO_API_BASE_URL = 'https://app.pendo.io/api/v1';

interface PendoOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tokenUrl: string;
  authUrl: string;
}

interface OAuthToken {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Timestamp when the token expires
}

// Initialize with environment variables (will be set after OAuth flow)
let currentToken: OAuthToken | null = null;

// Interfaces for Pendo data
export interface PendoMetric {
  id: string;
  name: string;
  value: number;
  formattedValue: string;
  trend?: number;
  timestamp: string;
}

export interface FrictionData {
  dropOffRate: PendoMetric;
  averageTimeSpent?: PendoMetric;
  bounceRate?: PendoMetric;
  errorRate?: PendoMetric;
}

/**
 * Generate the OAuth authorization URL to redirect the user to
 */
export function getAuthorizationUrl(): string {
  // These values would typically come from environment variables
  const clientId = process.env.PENDO_CLIENT_ID || 'demo-client-id';
  const redirectUri = process.env.PENDO_REDIRECT_URI || 'https://blupi.app/api/pendo/callback';
  const authUrl = 'https://app.pendo.io/oauth/authorize';
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'read:analytics write:features'
  });
  
  return `${authUrl}?${params.toString()}`;
}

/**
 * Exchange an authorization code for access and refresh tokens
 */
export async function exchangeCodeForToken(code: string): Promise<OAuthToken | null> {
  try {
    // These values would typically come from environment variables
    const clientId = process.env.PENDO_CLIENT_ID || 'demo-client-id';
    const clientSecret = process.env.PENDO_CLIENT_SECRET || 'demo-client-secret';
    const redirectUri = process.env.PENDO_REDIRECT_URI || 'https://blupi.app/api/pendo/callback';
    const tokenUrl = 'https://app.pendo.io/oauth/token';
    
    const response = await axios.post(tokenUrl, {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    if (response.status === 200 && response.data.access_token) {
      // Calculate expiry time (usually expires_in is in seconds)
      const expiresAt = Date.now() + (response.data.expires_in * 1000);
      
      // Store the token
      currentToken = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_at: expiresAt
      };
      
      return currentToken;
    }
    
    throw new Error('Failed to exchange code for token');
  } catch (error) {
    console.error('[Pendo OAuth] Error exchanging code for token:', error);
    return null;
  }
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken(): Promise<boolean> {
  if (!currentToken?.refresh_token) {
    return false;
  }
  
  try {
    // These values would typically come from environment variables
    const clientId = process.env.PENDO_CLIENT_ID || 'demo-client-id';
    const clientSecret = process.env.PENDO_CLIENT_SECRET || 'demo-client-secret';
    const tokenUrl = 'https://app.pendo.io/oauth/token';
    
    const response = await axios.post(tokenUrl, {
      grant_type: 'refresh_token',
      refresh_token: currentToken.refresh_token,
      client_id: clientId,
      client_secret: clientSecret
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    if (response.status === 200 && response.data.access_token) {
      // Calculate expiry time
      const expiresAt = Date.now() + (response.data.expires_in * 1000);
      
      // Update the token
      currentToken = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || currentToken.refresh_token,
        expires_at: expiresAt
      };
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[Pendo OAuth] Error refreshing token:', error);
    return false;
  }
}

/**
 * Get a valid access token, refreshing if necessary
 */
async function getValidAccessToken(): Promise<string | null> {
  if (!currentToken) {
    return null;
  }
  
  // Check if token is expired or about to expire (within 5 minutes)
  if (Date.now() > (currentToken.expires_at - 5 * 60 * 1000)) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      return null;
    }
  }
  
  return currentToken.access_token;
}

/**
 * Get metrics for a specific friction point
 */
export async function getFrictionMetrics(frictionId: string, touchpointId?: string): Promise<FrictionData | null> {
  const accessToken = await getValidAccessToken();
  
  // If no access token is available, return simulated data for development
  if (!accessToken) {
    console.log('[Pendo] No access token available, returning development data');
    return generateDevData(frictionId);
  }

  try {
    // Make API request to Pendo with OAuth token
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    };

    // Make API request to Pendo
    const response = await axios.get(`${PENDO_API_BASE_URL}/aggregation/feature/${frictionId}/metrics`, {
      headers,
      params: touchpointId ? { relatedTo: touchpointId } : {}
    });

    // Process and return the data
    if (response.status === 200) {
      return processApiResponse(response.data);
    }

    throw new Error(`Failed to fetch data: ${response.statusText}`);
  } catch (error) {
    console.error('[Pendo API] Error fetching friction metrics:', error);
    return null;
  }
}

/**
 * Process raw API response into our application format
 */
function processApiResponse(data: any): FrictionData {
  // This would parse the actual Pendo API response format
  // For now, returning a simplified placeholder format
  return {
    dropOffRate: {
      id: 'drop-off-rate',
      name: 'Drop-off Rate',
      value: data.dropOff || 0.25,
      formattedValue: `${((data.dropOff || 0.25) * 100).toFixed(1)}%`,
      trend: data.dropOffTrend || -2.5,
      timestamp: new Date().toISOString()
    },
    averageTimeSpent: {
      id: 'time-spent',
      name: 'Avg. Time Spent',
      value: data.timeSpent || 45,
      formattedValue: `${data.timeSpent || 45}s`,
      trend: data.timeSpentTrend || 5.2,
      timestamp: new Date().toISOString()
    },
    bounceRate: {
      id: 'bounce-rate',
      name: 'Bounce Rate',
      value: data.bounceRate || 0.12,
      formattedValue: `${((data.bounceRate || 0.12) * 100).toFixed(1)}%`,
      trend: data.bounceRateTrend || -1.3,
      timestamp: new Date().toISOString()
    },
    errorRate: {
      id: 'error-rate',
      name: 'Error Rate',
      value: data.errorRate || 0.03,
      formattedValue: `${((data.errorRate || 0.03) * 100).toFixed(1)}%`,
      trend: data.errorRateTrend || -0.8,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Generate development data when no OAuth token is available
 * This allows for UI testing without an active Pendo integration
 * NOTE: This should only be used for development/testing
 */
function generateDevData(frictionId: string): FrictionData {
  // Use the frictionId to have consistent data for the same friction point
  const idSum = frictionId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const seed = idSum / 1000;
  
  // Create deterministic but realistic looking metrics based on the frictionId
  const dropOffRate = 0.15 + (seed * 0.2); // 15-35%
  const timeSpent = 25 + Math.floor(seed * 40); // 25-65 seconds
  const bounceRate = 0.08 + (seed * 0.15); // 8-23%
  const errorRate = 0.01 + (seed * 0.05); // 1-6%
  
  return {
    dropOffRate: {
      id: 'drop-off-rate',
      name: 'Drop-off Rate',
      value: dropOffRate,
      formattedValue: `${(dropOffRate * 100).toFixed(1)}%`,
      trend: -1 * (2 + (seed * 3)),
      timestamp: new Date().toISOString()
    },
    averageTimeSpent: {
      id: 'time-spent',
      name: 'Avg. Time Spent',
      value: timeSpent,
      formattedValue: `${timeSpent}s`,
      trend: 2 + (seed * 4),
      timestamp: new Date().toISOString()
    },
    bounceRate: {
      id: 'bounce-rate',
      name: 'Bounce Rate',
      value: bounceRate,
      formattedValue: `${(bounceRate * 100).toFixed(1)}%`,
      trend: -0.5 - (seed * 2),
      timestamp: new Date().toISOString()
    },
    errorRate: {
      id: 'error-rate',
      name: 'Error Rate',
      value: errorRate,
      formattedValue: `${(errorRate * 100).toFixed(1)}%`,
      trend: -0.2 - (seed * 2),
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Check if Pendo API is configured via OAuth
 */
export function isPendoConfigured(): boolean {
  return !!currentToken;
}

/**
 * Store OAuth token received from the authorization flow
 */
export function setOAuthToken(token: OAuthToken): void {
  currentToken = token;
}