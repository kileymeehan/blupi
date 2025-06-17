import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

export default function PendoConnectedPage() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<'success' | 'error'>('success');
  const [countDown, setCountDown] = useState(5);
  
  useEffect(() => {
    // Parse the URL query parameters
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status');
    
    if (statusParam === 'error') {
      setStatus('error');
    }
    
    // Auto redirect to dashboard after countdown
    const timer = setInterval(() => {
      setCountDown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-2">
            {status === 'success' ? (
              <CheckCircle className="h-12 w-12 text-green-500" />
            ) : (
              <AlertCircle className="h-12 w-12 text-red-500" />
            )}
          </div>
          <CardTitle className="text-center text-xl">
            {status === 'success' 
              ? 'Pendo Integration Connected' 
              : 'Connection Error'}
          </CardTitle>
          <CardDescription className="text-center">
            {status === 'success'
              ? 'Your Pendo account has been successfully connected.'
              : 'There was an error connecting your Pendo account.'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              {status === 'success' 
                ? 'You can now view real customer behavior metrics for friction points in your blueprints.' 
                : 'Please try again or contact support if the problem persists.'}
            </p>
            
            {status === 'success' && (
              <div className="bg-green-50 text-green-800 p-3 rounded-md text-sm mt-4">
                <p>Redirecting you to the dashboard in {countDown} seconds...</p>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-center">
          <Button
            onClick={() => navigate('/dashboard')}
            variant={status === 'success' ? 'outline' : 'default'}
          >
            {status === 'success' ? 'Go to Dashboard Now' : 'Back to Dashboard'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}