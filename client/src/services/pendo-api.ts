/**
 * Client-side service for interacting with the Pendo API through our backend
 */

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
 * Get metrics data for a specific friction point
 */
export async function getFrictionData(frictionId: string, touchpointId?: string): Promise<FrictionData> {
  try {
    const url = new URL(`/api/pendo/friction/${frictionId}`, window.location.origin);
    if (touchpointId) {
      url.searchParams.append('touchpointId', touchpointId);
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch Pendo metrics: ${errorText || response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Pendo metrics:', error);
    throw error;
  }
}

/**
 * Check if Pendo is configured
 */
export async function isPendoConfigured(): Promise<boolean> {
  try {
    const response = await fetch('/api/pendo/status');
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return data.configured || false;
  } catch (error) {
    console.error('Error checking Pendo status:', error);
    return false;
  }
}

/**
 * Initialize Pendo OAuth flow
 */
export async function initiatePendoAuth(): Promise<string | null> {
  try {
    const response = await fetch('/api/pendo/authorize');
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to initiate Pendo OAuth: ${errorText || response.statusText}`);
    }
    
    const data = await response.json();
    return data.authUrl || null;
  } catch (error) {
    console.error('Error initiating Pendo OAuth flow:', error);
    return null;
  }
}