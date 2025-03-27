import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ProtectedRoute } from "@/lib/protected-route";
import { FirebaseProvider } from "@/lib/firebase-provider";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Board from "@/pages/board";
import LoginPage from "@/pages/auth/login";
import RegisterPage from "@/pages/auth/register";
import Dashboard from "@/pages/dashboard";
import Project from "@/pages/project";
import Profile from "@/pages/profile";
import PublicBoard from "@/pages/public-board";
import LandingPage from "@/pages/landing";

function Router() {
  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  // Accept multiple parameter formats for flexibility
  const showLanding = urlParams.get('landing') === 'true' || 
                      urlParams.get('mode') === 'landing' || 
                      urlParams.has('landing') || 
                      urlParams.has('home');
  
  // Check if we're on the main domain (blupi.io or www.blupi.io) or explicitly showing landing
  const host = window.location.host.toLowerCase();
  console.log("Current host is:", host);
  
  // Main domain is blupi.io, www.blupi.io, or any subdomain EXCEPT my.blupi.io
  const isMainDomain = host === "blupi.io" || 
                       host === "www.blupi.io" || 
                      (host.includes(".blupi.io") && !host.startsWith("my."));
  
  console.log("Is main domain?", isMainDomain);
  
  // In development, we can force landing page with any of the supported URL parameters
  // Show landing page on main domain or when explicitly requested
  if (isMainDomain || showLanding) {
    console.log("Showing landing page with URL params:", window.location.search);
    return (
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // This is the app domain (my.blupi.io) or the development server
  return (
    <Switch>
      <Route path="/auth/login" component={LoginPage} />
      <Route path="/auth/register" component={RegisterPage} />
      <Route path="/auth">
        <LoginPage />
      </Route>
      <Route path="/public/board/:id" component={PublicBoard} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/profile" component={Profile} />
      <ProtectedRoute path="/project/:id" component={Project} />
      <ProtectedRoute path="/project/:id/new" component={Board} />
      <ProtectedRoute path="/boards" component={Home} />
      <ProtectedRoute path="/board/new" component={Board} />
      <ProtectedRoute path="/board/:id" component={Board} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FirebaseProvider>
        <Router />
        <Toaster />
      </FirebaseProvider>
    </QueryClientProvider>
  );
}

export default App;