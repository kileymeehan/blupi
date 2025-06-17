import { useState, useEffect } from 'react';
import { ArrowDownIcon, ArrowUpIcon, InfoIcon, ExternalLinkIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { getFrictionData, type PendoMetric } from '../../services/pendo-api';

interface PendoMetricsProps {
  frictionId: string;
  touchpointId?: string;
  className?: string;
}

export function PendoMetrics({ frictionId, touchpointId, className = '' }: PendoMetricsProps) {
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  
  // Fetch Pendo metrics data
  const { 
    data: metricsData, 
    isLoading, 
    isError, 
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/pendo/friction', frictionId, touchpointId],
    queryFn: async () => {
      return await getFrictionData(frictionId, touchpointId);
    }
  });

  // Check Pendo API connection status
  const { 
    data: statusData,
    isLoading: isStatusLoading
  } = useQuery({
    queryKey: ['/api/pendo/status'],
    queryFn: async () => {
      const response = await fetch('/api/pendo/status');
      if (!response.ok) {
        throw new Error('Failed to check Pendo API status');
      }
      return response.json();
    }
  });

  const isPendoConfigured = statusData?.configured || false;

  // Function to initiate Pendo OAuth flow
  const handleConnectPendo = async () => {
    try {
      // TODO: Implement initiatePendoAuth function
      console.log('Connect to Pendo clicked');
    } catch (error) {
      console.error('Failed to initiate Pendo OAuth flow:', error);
    }
  };

  // Helper function to render trend indicator
  const renderTrendIndicator = (metric: PendoMetric) => {
    if (metric.trend === undefined || metric.trend === 0) {
      return null;
    }

    const isPositive = metric.trend > 0;
    const isPosGood = metric.id === 'time-spent'; // For time spent, up is good
    const isNegGood = ['drop-off-rate', 'bounce-rate', 'error-rate'].includes(metric.id); // For these, down is good
    
    const isGood = (isPositive && isPosGood) || (!isPositive && isNegGood);
    const colorClass = isGood ? 'text-green-500' : 'text-red-500';
    
    return (
      <div className={`flex items-center ${colorClass} ml-2 text-sm`}>
        {isPositive ? (
          <ArrowUpIcon className="h-3 w-3 mr-0.5" />
        ) : (
          <ArrowDownIcon className="h-3 w-3 mr-0.5" />
        )}
        <span>{Math.abs(metric.trend).toFixed(1)}%</span>
      </div>
    );
  };
  
  if (isLoading || isStatusLoading) {
    return (
      <div className={`w-full p-2 ${className}`}>
        <div className="text-xs font-medium mb-1">Customer Behavior Metrics</div>
        <div className="text-xs text-gray-500 mb-2">Loading metrics...</div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
    );
  }

  if (!isPendoConfigured) {
    return (
      <div className={`w-full p-2 ${className}`}>
        <div className="text-xs font-medium mb-1">Customer Behavior Metrics</div>
        <div className="text-xs text-gray-500 mb-2">Connect to Pendo to see metrics</div>
        <p className="text-xs text-gray-600 mb-2">
          Connect your Pendo account to view real customer behavior metrics for this friction point.
        </p>
        <Button 
          size="sm" 
          variant="outline" 
          className="w-full text-xs py-1 h-6"
          onClick={handleConnectPendo}
        >
          Connect Pendo
        </Button>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className={`w-full p-2 ${className}`}>
        <div className="text-xs font-medium mb-1">Customer Behavior Metrics</div>
        <div className="text-xs text-gray-500 mb-2">Error loading metrics</div>
        <p className="text-xs text-gray-600 mb-2">
          {error instanceof Error ? error.message : 'Failed to load metrics data.'}
        </p>
        <Button 
          size="sm" 
          variant="outline" 
          className="w-full text-xs py-1 h-6"
          onClick={() => refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!metricsData) {
    return (
      <div className={`w-full p-2 ${className}`}>
        <div className="text-xs font-medium mb-1">Customer Behavior Metrics</div>
        <div className="text-xs text-gray-500 mb-2">No data available</div>
        <p className="text-xs text-gray-600">
          No metrics data available for this friction point.
        </p>
      </div>
    );
  }

  return (
    <div className={`w-full p-2 ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <div className="text-xs font-medium">Customer Behavior Metrics</div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-4 w-4 text-muted-foreground">
                <InfoIcon className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs max-w-xs">
                These metrics show actual customer behavior at this friction point, 
                including drop-off rates and time spent.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="space-y-1.5">
          {/* Drop-off Rate */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Drop-off Rate:</span>
            <div className="flex items-center">
              <span className="text-sm font-medium">{metricsData.dropOffRate.formattedValue}</span>
              {renderTrendIndicator(metricsData.dropOffRate)}
            </div>
          </div>
          
          {/* Time Spent */}
          {metricsData.averageTimeSpent && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Avg. Time Spent:</span>
              <div className="flex items-center">
                <span className="text-sm font-medium">{metricsData.averageTimeSpent.formattedValue}</span>
                {renderTrendIndicator(metricsData.averageTimeSpent)}
              </div>
            </div>
          )}
          
          {/* Bounce Rate */}
          {metricsData.bounceRate && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Bounce Rate:</span>
              <div className="flex items-center">
                <span className="text-sm font-medium">{metricsData.bounceRate.formattedValue}</span>
                {renderTrendIndicator(metricsData.bounceRate)}
              </div>
            </div>
          )}
          
          {/* Error Rate */}
          {metricsData.errorRate && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Error Rate:</span>
              <div className="flex items-center">
                <span className="text-sm font-medium">{metricsData.errorRate.formattedValue}</span>
                {renderTrendIndicator(metricsData.errorRate)}
              </div>
            </div>
          )}
        </div>
        <div className="w-full flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
          <Badge variant="outline" className="text-xs font-normal">
            Last updated: {new Date(metricsData.dropOffRate.timestamp).toLocaleDateString()}
          </Badge>
          <Button variant="ghost" size="sm" className="h-4 p-0 text-xs">
            <ExternalLinkIcon className="h-2 w-2 mr-1" />
            <span className="text-xs">View in Pendo</span>
          </Button>
        </div>
      </div>
    );
}