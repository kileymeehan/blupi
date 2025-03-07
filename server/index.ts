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

// Detailed request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  log(`[${requestId}] [${new Date().toISOString()}] ${req.method} ${req.path} started`);
  log(`[${requestId}] Headers: ${JSON.stringify(req.headers)}`);
  log(`[${requestId}] Query: ${JSON.stringify(req.query)}`);

  // Log response
  const oldWrite = res.write;
  const oldEnd = res.end;

  const chunks: Buffer[] = [];

  res.write = function (chunk: any) {
    chunks.push(Buffer.from(chunk));
    return oldWrite.apply(res, arguments as any);
  };

  res.end = function (chunk: any) {
    if (chunk) {
      chunks.push(Buffer.from(chunk));
    }
    const duration = Date.now() - start;
    log(`[${requestId}] [${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} completed in ${duration}ms`);

    return oldEnd.apply(res, arguments as any);
  };

  next();
});

// Test route to verify basic Express functionality
app.get('/api/test', (_req, res) => {
  log('[INFO] Test route accessed');
  res.json({ status: 'ok', message: 'Express server is running' });
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
    log(`[ERROR] Stack trace: ${err.stack}`);
    return res.status(400).json({ error: true, message: 'Invalid JSON' });
  }
  next(err);
});

(async () => {
  try {
    log('[INFO] Starting server initialization...');

    // Register API routes before Vite middleware
    const server = await registerRoutes(app);
    log('[INFO] API routes registered successfully');

    // Set up development middleware or static serving
    if (process.env.NODE_ENV !== "production") {
      log('[INFO] Setting up Vite development middleware');
      await setupVite(app, server);
      log('[INFO] Vite middleware setup complete');
    } else {
      log('[INFO] Setting up static file serving');
      serveStatic(app);
      log('[INFO] Static file serving setup complete');
    }

    // API Error handling middleware - must be after all routes
    app.use('/api', (err: any, req: Request, res: Response, next: NextFunction) => {
      const errorId = Math.random().toString(36).substring(7);
      console.error(`[ERROR] [${errorId}] API Error:`, err);
      console.error(`[ERROR] [${errorId}] Stack trace:`, err.stack);
      console.error(`[ERROR] [${errorId}] Request headers:`, req.headers);
      console.error(`[ERROR] [${errorId}] Request query:`, req.query);
      console.error(`[ERROR] [${errorId}] Request body:`, req.body);

      if (!res.headersSent) {
        res.status(500).json({
          error: true,
          message: err.message || "Internal Server Error",
          errorId // Include error ID in response for correlation
        });
      }
    });

    const port = Number(process.env.PORT) || 5000;
    const host = '0.0.0.0'; // Listen on all network interfaces

    server.listen(port, host, () => {
      log(`[INFO] Server running at http://${host}:${port}`);
    });

    server.on('error', (error: any) => {
      console.error('[ERROR] Server error:', error);
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

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error('[ERROR] Uncaught Exception:', err);
      console.error('[ERROR] Stack trace:', err.stack);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('[ERROR] Unhandled Rejection at:', promise);
      console.error('[ERROR] Reason:', reason);
      if (reason instanceof Error) {
        console.error('[ERROR] Stack trace:', reason.stack);
      }
      process.exit(1);
    });

  } catch (err) {
    console.error('[ERROR] Failed to start server:', err);
    if (err instanceof Error) {
      console.error('[ERROR] Stack trace:', err.stack);
    }
    process.exit(1);
  }
})();