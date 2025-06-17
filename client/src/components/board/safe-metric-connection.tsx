import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { MetricsDialog } from '@/components/google-sheets/metrics-dialog';
import { withErrorBoundary } from '@/components/error-boundary';

// This is a dedicated component for safely connecting metric blocks to Google Sheets
// It handles all the complexities of state management and error handling

interface SafeMetricConnectionProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: any) => void;
  initialData?: any;
}

function SafeMetricConnectionComponent({
  isOpen,
  onClose,
  onComplete,
  initialData
}: SafeMetricConnectionProps) {
  const { toast } = useToast();
  const connectionDataRef = useRef<any>(null);
  const [hasSavedState, setHasSavedState] = useState(false);
  
  // Check for a recovered session if we get initialized without initial data
  useEffect(() => {
    if (!initialData) {
      try {
        const savedState = sessionStorage.getItem('lastMetricsConnection');
        if (savedState) {
          const { data, timestamp } = JSON.parse(savedState);
          const timeElapsed = Date.now() - timestamp;
          
          // Only use if saved within the last minute
          if (timeElapsed < 60000) {
            console.log("📊 Recovering connection data from session storage", data);
            connectionDataRef.current = data;
            setHasSavedState(true);
          } else {
            // Clear old saved state
            sessionStorage.removeItem('lastMetricsConnection');
          }
        }
      } catch (e) {
        console.error("Error recovering connection data:", e);
      }
    }
  }, [initialData]);
  
  const handleSafeClose = () => {
    // If we have stored connection data, save it to session storage
    if (connectionDataRef.current) {
      try {
        sessionStorage.setItem('lastMetricsConnection', JSON.stringify({
          data: connectionDataRef.current,
          timestamp: Date.now()
        }));
        console.log("📊 Saved connection data to session storage", connectionDataRef.current);
      } catch (e) {
        console.error("Error saving connection data:", e);
      }
    }
    
    // Close the dialog
    onClose();
  };
  
  const handleSafeComplete = async (data: any) => {
    try {
      // Store the data reference
      connectionDataRef.current = data;
      console.log("📊 SafeMetricConnection received data:", data);
      
      // Store in session storage as backup
      sessionStorage.setItem('lastMetricsConnection', JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      
      // First close the dialog to remove it from DOM
      onClose();
      
      // Wait for DOM to stabilize
      await new Promise<void>(resolve => {
        // Use multiple requestAnimationFrames to ensure we're outside the current render cycle
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              try {
                // Now it's safe to update parent state
                onComplete(data);
                console.log("📊 SafeMetricConnection successfully completed");
                
                // Clear session storage
                sessionStorage.removeItem('lastMetricsConnection');
              } catch (e) {
                console.error("Error during metric connection completion:", e);
                toast({
                  title: "Connection Error",
                  description: "There was a problem saving the connection. Please try again.",
                  variant: "destructive"
                });
              }
              resolve();
            }, 200);
          });
        });
      });
    } catch (e) {
      console.error("Error in handleSafeComplete:", e);
      toast({
        title: "Connection Error",
        description: "There was a problem completing the connection. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // If we have saved state but no initialData, use the saved state
  const effectiveInitialData = initialData || (hasSavedState ? connectionDataRef.current : undefined);
  
  return (
    <MetricsDialog
      isOpen={isOpen}
      onClose={handleSafeClose}
      onComplete={handleSafeComplete}
      initialData={effectiveInitialData}
    />
  );
}

// Wrap with error boundary
export const SafeMetricConnection = withErrorBoundary(SafeMetricConnectionComponent);