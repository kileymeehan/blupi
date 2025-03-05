import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import passport from "passport";
import session from "express-session";
import { storage } from "./storage";
import { createServer } from "http";
import { setupAuth } from "./auth";

const app = express();

// Body parsing middleware - must be first
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

// Setup authentication routes
setupAuth(app);

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
  });
  next();
});

// Set default content type for API routes
app.use('/api', (req, res, next) => {
  res.type('application/json');
  next();
});

// Error handling for JSON parsing
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: true, message: 'Invalid JSON' });
  }
  next(err);
});

(async () => {
  try {
    // Set up development middleware
    if (process.env.NODE_ENV !== "production") {
      await setupVite(app);
    } else {
      serveStatic(app);
    }

    // Register API routes after Vite middleware
    const server = await registerRoutes(app);

    // API Error handling middleware - must be after all routes
    app.use('/api', (err: any, req: Request, res: Response, next: NextFunction) => {
      console.error('API Error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          error: true,
          message: err.message || "Internal Server Error"
        });
      }
    });

    const port = process.env.PORT || 5000;
    server.listen(port, () => {
      log(`Server running on port ${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();