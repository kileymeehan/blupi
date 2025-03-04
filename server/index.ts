import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import passport from "passport";
import session from "express-session";
import { storage } from "./storage";
import { createServer } from "http";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  },
  store: storage.sessionStore
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

(async () => {
  // Create HTTP server first
  const server = createServer(app);

  if (process.env.NODE_ENV !== "production") {
    // Set up Vite's dev middleware
    await setupVite(app);
  } else {
    // In production, serve static files
    serveStatic(app);
  }

  // Register API routes
  await registerRoutes(app);

  const port = process.env.PORT || 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`Server running on port ${port}`);
  });
})().catch(console.error);

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ error: true, message });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: true, message: "Not Found" });
});