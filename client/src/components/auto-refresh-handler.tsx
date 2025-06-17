import { useEffect } from 'react';

export function AutoRefreshHandler() {
  useEffect(() => {
    let errorCount = 0;
    const maxErrors = 2; // Refresh after 2 DOM errors
    const resetTime = 10000; // Reset error count after 10 seconds

    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.message || '';
      
      // Check for DOM insertion errors specifically
      if (
        errorMessage.includes('insertBefore') || 
        errorMessage.includes('Failed to execute') ||
        errorMessage.includes('The node before which the new node is to be inserted is not a child of this node')
      ) {
        errorCount++;
        console.log(`DOM error detected (${errorCount}/${maxErrors}):`, errorMessage);
        
        if (errorCount >= maxErrors) {
          console.log('Multiple DOM errors detected, auto-refreshing page...');
          // Small delay to let any pending operations complete
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
        
        // Reset error count after a period of no errors
        setTimeout(() => {
          errorCount = Math.max(0, errorCount - 1);
        }, resetTime);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || event.reason || '';
      
      // Check for DOM-related promise rejections
      if (
        typeof reason === 'string' && (
          reason.includes('insertBefore') ||
          reason.includes('Failed to execute') ||
          reason.includes('DOM')
        )
      ) {
        errorCount++;
        console.log(`DOM rejection detected (${errorCount}/${maxErrors}):`, reason);
        
        if (errorCount >= maxErrors) {
          console.log('Multiple DOM rejections detected, auto-refreshing page...');
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
        
        // Reset error count after a period
        setTimeout(() => {
          errorCount = Math.max(0, errorCount - 1);
        }, resetTime);
      }
    };

    // Listen for JavaScript errors
    window.addEventListener('error', handleError);
    
    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null; // This component doesn't render anything
}