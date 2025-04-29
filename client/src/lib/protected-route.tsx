import { useFirebase } from "@/lib/firebase-provider";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useEffect, useState } from "react";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, loading } = useFirebase();
  const [isDevBypass, setIsDevBypass] = useState(false);
  
  // Check for development bypass mode
  useEffect(() => {
    const devBypassEnabled = localStorage.getItem('blupi_dev_bypass') === 'true';
    setIsDevBypass(devBypassEnabled);
  }, []);

  if (loading && !isDevBypass) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  // Allow access if user is authenticated or if dev bypass is enabled
  if (!user && !isDevBypass) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}