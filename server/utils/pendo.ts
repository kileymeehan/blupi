/**
 * Pendo API utility functions
 */
import axios from 'axios';

// Pendo API base URL
const PENDO_API_BASE_URL = 'https://app.pendo.io/api/v1';

interface PendoConfig {
  apiKey: string;
}

// Initialize with environment variables
const pendoConfig: PendoConfig = {
  apiKey: process.env.PENDO_API_KEY || '',
};

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
 * Get metrics for a specific friction point
 */
export async function getFrictionMetrics(frictionId: string, touchpointId?: string): Promise<FrictionData | null> {
  // If no API key is configured, return simulated data for development
  if (!pendoConfig.apiKey) {
    console.log('[Pendo] No API key found, returning development data');
    return generateDevData(frictionId);
  }

  try {
    // This would be replaced with actual Pendo API calls once API key is configured
    const headers = {
      'Content-Type': 'application/json',
      'x-pendo-integration-key': pendoConfig.apiKey
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
 * Generate development data when no Pendo API key is available
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
 * Check if Pendo API is configured
 */
export function isPendoConfigured(): boolean {
  return !!pendoConfig.apiKey;
}