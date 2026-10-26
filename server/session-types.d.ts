import "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    email?: string;
    displayName?: string;
    oauthState?: string;
    user?: {
      id: number;
      email: string;
      username: string;
    };
  }
}