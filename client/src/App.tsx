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
  // Force landing page mode with URL param for development testing
  const urlParams = new URLSearchParams(window.location.search);
  const forceLandingMode = urlParams.get('mode') === 'landing';
  
  // Check if we're on the main domain (blupi.io) or forcing landing page mode
  const isMainDomain = window.location.host === "blupi.io" || forceLandingMode;
  
  // In development, we may want to show the landing page
  // You can access it via: /?mode=landing
  if (isMainDomain) {
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