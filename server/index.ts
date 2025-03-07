import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import passport from "passport";
import session from "express-session";
import { storage } from "./storage";
import { setupAuth } from "./auth";

// Disable cartographer plugin and force production mode
delete process.env.REPL_ID;
process.env.NODE_ENV = "production";

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
    log('[INFO] Starting server initialization...');

    // Register API routes
    const server = await registerRoutes(app);
    log('[INFO] API routes registered successfully');

    try {
      // In production mode, only use static file serving
      log('[INFO] Setting up static file serving');
      serveStatic(app);
      log('[INFO] Static file serving setup complete');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Could not find the build directory')) {
        log('[WARN] Build directory not found, falling back to Vite middleware');
        await setupVite(app, server);
        log('[INFO] Vite fallback middleware setup complete');
      } else {
        log('[ERROR] Failed to setup middleware:');
        console.error(error);
        process.exit(1);
      }
    }

    // API Error handling middleware - must be after all routes
    app.use('/api', (err: any, req: Request, res: Response, next: NextFunction) => {
      console.error('[ERROR] API Error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          error: true,
          message: err.message || "Internal Server Error"
        });
      }
    });

    // Start the server
    const port = Number(process.env.PORT) || 5000;
    const host = '0.0.0.0';

    server.listen(port, host, () => {
      log(`[INFO] Server running at http://${host}:${port}`);
    });

  } catch (err) {
    console.error('[ERROR] Failed to start server:', err);
    process.exit(1);
  }
})();