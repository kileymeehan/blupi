import { useAuth } from "@/hooks/use-simple-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  return (
    <Route path={path}>
      {() => {
        const { user, loading } = useAuth();
        
        if (loading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          );
        }

        if (!user) {
          console.log(`ProtectedRoute ${path}: redirecting to login`);
          return <Redirect to="/auth/login" />;
        }

        console.log(`ProtectedRoute ${path}: rendering component`);
        return <Component />;
      }}
    </Route>
  );
}