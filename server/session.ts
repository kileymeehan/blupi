import session from "express-session";
import { storage } from "./storage";

// Shared by Express and the collaboration WebSocket, which reads the same
// session cookie to identify who is connecting
export const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'dev_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
    sameSite: 'lax' // Provides some CSRF protection
  },
  store: storage.sessionStore
});
