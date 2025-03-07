import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import passport from "passport";
import session from "express-session";
import { storage } from "./storage";
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

// Add test endpoint
app.get('/api/test', (_req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

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
    // Register API routes before Vite middleware
    const server = await registerRoutes(app);

    // Set up development middleware
    if (process.env.NODE_ENV !== "production") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

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

    const port = Number(process.env.PORT) || 5000;
    const host = '0.0.0.0'; // Listen on all network interfaces

    server.listen(port, host, () => {
      log(`Server running at http://${host}:${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();