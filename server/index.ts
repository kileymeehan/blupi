import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import passport from "passport";
import session from "express-session";
import { storage } from "./storage";
import { createServer } from "http";
import { setupAuth } from "./auth";

async function initializeServer() {
  try {
    const app = express();
    log('[INFO] Created Express application');

    // Body parsing middleware - must be first
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    log('[INFO] Body parsing middleware initialized');

    try {
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
      log('[INFO] Session middleware initialized');
    } catch (err) {
      log('[ERROR] Failed to initialize session middleware:', err);
      throw err;
    }

    // Initialize passport
    app.use(passport.initialize());
    app.use(passport.session());
    log('[INFO] Passport initialized');

    // Setup authentication routes
    setupAuth(app);
    log('[INFO] Auth routes initialized');

    // Logging middleware
    app.use((req, res, next) => {
      const start = Date.now();
      log(`[${new Date().toISOString()}] ${req.method} ${req.path} started`);
      res.on("finish", () => {
        const duration = Date.now() - start;
        log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} completed in ${duration}ms`);
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
        log(`[ERROR] JSON parsing error: ${err.message}`);
        return res.status(400).json({ error: true, message: 'Invalid JSON' });
      }
      next(err);
    });

    try {
      log('[INFO] Starting server initialization...');

      // Register API routes before Vite middleware
      const server = await registerRoutes(app);
      log('[INFO] API routes registered successfully');

      // Temporarily disable Vite setup for debugging
      log('[INFO] Vite middleware setup bypassed for debugging');
      app.get('*', (req, res) => {
        res.json({ status: 'Server running in debug mode - Vite disabled' });
      });


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

      const port = Number(process.env.PORT) || 5000; // Using port 5000 as required
      const host = '0.0.0.0'; // Bind to all network interfaces

      log('[INFO] Attempting to start server on port', port);
      server.listen(port, host, () => {
        log(`[INFO] Server running at http://${host}:${port}`);
      });

      server.on('error', (error: any) => {
        if (error.syscall !== 'listen') {
          throw error;
        }

        const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

        switch (error.code) {
          case 'EACCES':
            console.error(`[ERROR] ${bind} requires elevated privileges`);
            process.exit(1);
            break;
          case 'EADDRINUSE':
            console.error(`[ERROR] ${bind} is already in use`);
            process.exit(1);
            break;
          default:
            throw error;
        }
      });

      return server;
    } catch (err) {
      log('[ERROR] Failed during server setup:', err);
      throw err;
    }
  } catch (err) {
    log('[ERROR] Fatal error during server initialization:', err);
    throw err;
  }
}

// Start the server
initializeServer().catch((err) => {
  console.error('[ERROR] Failed to start server:', err);
  process.exit(1);
});