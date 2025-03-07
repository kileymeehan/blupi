import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ProtectedRoute } from "@/lib/protected-route";
import { FirebaseProvider } from "@/lib/firebase-provider";
import { NotificationsProvider } from "@/lib/notifications-provider";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Board from "@/pages/board";
import LoginPage from "@/pages/auth/login";
import RegisterPage from "@/pages/auth/register";
import Dashboard from "@/pages/dashboard";
import Project from "@/pages/project";
import Profile from "@/pages/profile";
import PublicBoard from "@/pages/public-board";

function Router() {
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
        <NotificationsProvider>
          <Router />
          <Toaster />
        </NotificationsProvider>
      </FirebaseProvider>
    </QueryClientProvider>
  );
}

export default App;