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
      const response = await fetch('/api/pendo/authorize');
      const data = await response.json();
      
      if (data.authUrl) {
        // Open the authorization URL in a new window
        window.open(data.authUrl, '_blank', 'width=800,height=600');
      }
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
      <Card className={`w-full ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Customer Behavior Metrics</CardTitle>
          <CardDescription className="text-xs">Loading metrics...</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isPendoConfigured) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Customer Behavior Metrics</CardTitle>
          <CardDescription className="text-xs">Connect to Pendo to see metrics</CardDescription>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-sm text-muted-foreground mb-3">
            Connect your Pendo account to view real customer behavior metrics for this friction point.
          </p>
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full"
            onClick={handleConnectPendo}
          >
            Connect Pendo
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  if (isError) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Customer Behavior Metrics</CardTitle>
          <CardDescription className="text-xs">Error loading metrics</CardDescription>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-sm text-muted-foreground mb-3">
            {error instanceof Error ? error.message : 'Failed to load metrics data.'}
          </p>
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!metricsData) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Customer Behavior Metrics</CardTitle>
          <CardDescription className="text-xs">No data available</CardDescription>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-sm text-muted-foreground">
            No metrics data available for this friction point.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium">Customer Behavior Metrics</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground">
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
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2.5">
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
      </CardContent>
      <CardFooter className="pt-0">
        <div className="w-full flex justify-between items-center">
          <Badge variant="outline" className="text-xs font-normal">
            Last updated: {new Date(metricsData.dropOffRate.timestamp).toLocaleDateString()}
          </Badge>
          <Button variant="ghost" size="sm" className="h-6 p-0">
            <ExternalLinkIcon className="h-3 w-3 mr-1" />
            <span className="text-xs">View in Pendo</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}