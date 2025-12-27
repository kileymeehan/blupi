import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ProtectedRoute } from "@/lib/protected-route";
import { AuthProvider } from "@/hooks/use-simple-auth";
import { AutoRefreshHandler } from "@/components/auto-refresh-handler";
import { Suspense } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Board from "@/pages/board";
import LoginPage from "@/pages/auth/login";
import RegisterPage from "@/pages/auth/register";
import MagicLinkPage from "@/pages/auth/magic-link";
import ConfirmSignInPage from "@/pages/auth/confirm-signin";
import AuthHandlerPage from "@/pages/auth/auth-handler";
import SimpleGoogleCallbackPage from "@/pages/auth/simple-google-callback";
import Dashboard from "@/pages/dashboard";
import Project from "@/pages/project";

import TeamPage from "@/pages/team";
import PublicBoard from "@/pages/public-board";
import LandingPage from "@/pages/landing";
import PendoConnectedPage from "@/pages/pendo-connected";
import InvitePage from "@/pages/invite-page";
import SettingsPage from "@/pages/settings";

console.log('[APP] App component imported successfully');

function Router() {
  console.log('[APP] Router component rendering...');
  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const [location] = useLocation();
  
  // Check hostname for domain-based routing
  const hostname = window.location.hostname;
  const isMarketingDomain = hostname === 'www.blupi.io' || hostname === 'blupi.io';
  const isAppDomain = hostname === 'my.blupi.io' || hostname.includes('localhost') || hostname.includes('replit');
  

  
  // Accept multiple parameter formats for flexibility
  const showLanding = urlParams.get('landing') === 'true' || 
                      urlParams.get('mode') === 'landing' || 
                      urlParams.has('landing') || 
                      urlParams.has('home');
  
  // Always show landing page on "/landing" path regardless of other conditions
  if (location === "/landing") {
    console.log('Showing landing page for /landing path');
    return <LandingPage />;
  }
  
  // Force landing page when explicitly requested with URL parameters
  if (showLanding) {
    console.log("Showing landing page with URL params:", window.location.search);
    return <LandingPage />;
  }
  
  // Domain-based routing: www.blupi.io goes to marketing landing page
  if (isMarketingDomain && location === "/") {
    console.log('Showing landing page for marketing domain');
    return <LandingPage />;
  }



  // This is the app domain (my.blupi.io) or the development server
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <Switch>
        <Route path="/landing" component={LandingPage} />
        <Route path="/auth/login" component={LoginPage} />
        <Route path="/auth/register" component={RegisterPage} />
        <Route path="/auth/magic-link" component={MagicLinkPage} />
        <Route path="/auth/confirm-signin" component={ConfirmSignInPage} />
        <Route path="/auth/handler" component={AuthHandlerPage} />
        <Route path="/auth/google-callback" component={SimpleGoogleCallbackPage} />
        <Route path="/auth">
          <LoginPage />
        </Route>
        <Route path="/invite/:token" component={InvitePage} />
        <Route path="/public/board/:id" component={PublicBoard} />
        <Route path="/pendo-connected" component={PendoConnectedPage} />
        <ProtectedRoute path="/" component={Dashboard} />
        <ProtectedRoute path="/dashboard" component={Dashboard} />
        <ProtectedRoute path="/settings" component={SettingsPage} />
        <ProtectedRoute path="/team" component={TeamPage} />
        <ProtectedRoute path="/projects" component={Dashboard} />
        <ProtectedRoute path="/project/:id" component={Project} />
        <ProtectedRoute path="/project/:id/new" component={Board} />
        <ProtectedRoute path="/boards" component={Home} />
        <ProtectedRoute path="/boards/:id" component={Board} /> {/* Added support for plural boards URL */}
        <ProtectedRoute path="/board/new" component={Board} />
        <ProtectedRoute path="/board/:id" component={Board} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  console.log('[APP] App function called');
  
  try {
    console.log('[APP] Creating QueryClientProvider...');
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AutoRefreshHandler />
          <Router />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    );
  } catch (error) {
    console.error('[APP] Error in App component:', error);
    return <div style={{padding: '20px', color: 'red'}}>
      <h1>Application Error</h1>
      <p>Failed to load the application. Check the console for details.</p>
      <pre>{error.toString()}</pre>
    </div>;
  }
}

export default App;