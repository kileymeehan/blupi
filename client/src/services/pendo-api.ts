/**
 * Service for connecting to the Pendo API to fetch analytics data
 */

// Define interfaces for Pendo API responses
export interface PendoMetric {
  id: string;
  name: string;
  value: number;
  formattedValue: string;
  trend?: number; // percentage change (positive or negative)
  timestamp: string;
}

export interface FrictionData {
  dropOffRate: PendoMetric;
  averageTimeSpent?: PendoMetric;
  bounceRate?: PendoMetric;
  errorRate?: PendoMetric;
}

// Cache data to reduce API calls
const metricsCache = new Map<string, FrictionData>();

/**
 * Fetch friction data for a specific touchpoint
 * @param frictionId - The ID of the friction point
 * @param touchpointId - The ID of the associated touchpoint (optional)
 */
export async function getFrictionData(frictionId: string, touchpointId?: string): Promise<FrictionData | null> {
  // Check if we have cached data
  const cacheKey = `${frictionId}:${touchpointId || 'default'}`;
  if (metricsCache.has(cacheKey)) {
    return metricsCache.get(cacheKey) || null;
  }
  
  try {
    // Make API call to fetch data from your backend
    const response = await fetch(`/api/pendo/friction/${frictionId}${touchpointId ? `?touchpointId=${touchpointId}` : ''}`);
    
    if (!response.ok) {
      console.error('Failed to fetch Pendo data:', await response.text());
      return null;
    }
    
    const data = await response.json();
    
    // Cache the results
    metricsCache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching Pendo friction data:', error);
    return null;
  }
}

/**
 * Clear the metrics cache
 */
export function clearPendoCache(): void {
  metricsCache.clear();
}