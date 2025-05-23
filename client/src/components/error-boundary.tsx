import React, { type ErrorInfo } from 'react';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-red-50 rounded-lg space-y-4">
      <AlertTriangle className="h-12 w-12 text-red-500" />
      <h2 className="text-xl font-semibold text-red-700">Something went wrong</h2>
      <p className="text-sm text-center text-red-600 max-w-md">
        There was an error with this component. You can try again or contact support if the problem persists.
      </p>
      <Button onClick={resetErrorBoundary} variant="destructive">
        Try again
      </Button>
    </div>
  );
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorHandler?: (error: Error, info: ErrorInfo) => void
) {
  const displayName = Component.displayName || Component.name || 'Component';
  
  const WrappedComponent = (props: P) => (
    <ReactErrorBoundary 
      FallbackComponent={ErrorFallback}
      onError={errorHandler}
      onReset={() => {
        // Force re-render the component when we try again
        window.location.reload();
      }}
    >
      <Component {...props} />
    </ReactErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${displayName})`;
  return WrappedComponent;
}