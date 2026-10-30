import "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    email?: string;
    displayName?: string;
    oauthState?: string;
    oauthNext?: string; // where to send the user after Google sign-in
    user?: {
      id: number;
      email: string;
      username: string;
    };
  }
}