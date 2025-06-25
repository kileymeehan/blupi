import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import passport from "passport";
import session from "express-session";
import { storage } from "./storage";
import { createServer } from "http";
import { setupAuth } from "./auth";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { errorMonitoringMiddleware, getHealthStatus } from "./monitoring";
import path from "path";

async function initializeServer() {
  try {
    const app = express();
    
    // Trust proxy - required for rate limiting when behind a proxy
    app.set('trust proxy', 1);
    
    log('[INFO] Created Express application');

    // Security middleware - should be one of the first middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 
                     "https://apis.google.com", 
                     "https://*.firebaseio.com", 
                     "https://*.googleapis.com",
                     "https://*.firebaseapp.com",
                     "https://*.gstatic.com",
                     "https://accounts.google.com",
                     "https://www.gstatic.com",
                     "https://accounts.google.com/*",
                     "https://ssl.gstatic.com",
                     "https://www.google.com"],
          connectSrc: ["'self'", "wss:", 
                      "https://*.googleapis.com", 
                      "https://*.firebaseio.com", 
                      "https://*.firebase.com",
                      "https://*.gstatic.com",
                      "https://accounts.google.com",
                      "https://www.googleapis.com",
                      "https://securetoken.googleapis.com",
                      "https://oauth2.googleapis.com"],
          frameSrc: ["'self'", 
                    "https://*.firebaseapp.com",
                    "https://accounts.google.com",
                    "https://*.google.com"],
          imgSrc: ["'self'", "data:", "blob:", "https:", "https://*.replit.app", "https://*.replit.dev"],
          styleSrc: ["'self'", "'unsafe-inline'", "https:"],
          fontSrc: ["'self'", "data:", "https:"],
          formAction: ["'self'", "https://accounts.google.com"],
          frameAncestors: ["'self'"],
          objectSrc: ["'none'"],
          reportUri: ["/api/csp-violation-report"]
        }
      },
      crossOriginEmbedderPolicy: false, // For compatibility with some embedded resources
      crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow resources to be shared cross-origin
      // Add HSTS with a generous max age
      strictTransportSecurity: {
        maxAge: 63072000, // 2 years in seconds
        includeSubDomains: true,
        preload: true
      }
    }));
    log('[INFO] Security middleware initialized');

    // CSP violation reporting endpoint
    app.post('/api/csp-violation-report', express.json({ type: 'application/csp-report' }), (req, res) => {
      console.error('[CSP VIOLATION] CSP violation reported:', {
        timestamp: new Date().toISOString(),
        report: req.body,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer')
      });
      res.status(204).send(); // No content response
    });

    // Diagnostic endpoint for CSP and image serving issues
    app.get('/api/debug/csp-info', (req, res) => {
      const debugInfo = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        host: req.get('Host'),
        protocol: req.protocol,
        secure: req.secure,
        userAgent: req.get('User-Agent'),
        cspDirectives: {
          imgSrc: ["'self'", "data:", "blob:", "https:", "https://*.replit.app", "https://*.replit.dev"],
          defaultSrc: ["'self'"],
          connectSrc: ["'self'", "wss:", "https://*.googleapis.com", "https://*.firebaseio.com"],
        },
        serverInfo: {
          nodeVersion: process.version,
          platform: process.platform,
          workingDirectory: process.cwd()
        }
      };
      
      console.log('[CSP DEBUG] Debug info requested:', debugInfo);
      res.json(debugInfo);
    });

    // Image serving diagnostic endpoint
    app.get('/api/debug/images/:filename?', (req, res) => {
      const fs = require('fs');
      const path = require('path');
      
      console.log('[IMAGE DEBUG] Diagnostic request received');
      
      const imageDir = path.join(process.cwd(), 'client', 'public', 'images');
      const publicDir = path.join(process.cwd(), 'public');
      
      let diagnostics = {
        timestamp: new Date().toISOString(),
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT,
          REPL_SLUG: process.env.REPL_SLUG,
          REPL_OWNER: process.env.REPL_OWNER,
          workingDir: process.cwd(),
          serverDir: process.cwd(),
          host: req.get('Host'),
          protocol: req.protocol
        },
        directories: {
          clientPublicImages: {
            path: imageDir,
            exists: fs.existsSync(imageDir),
            files: []
          },
          publicRoot: {
            path: publicDir,
            exists: fs.existsSync(publicDir),
            files: []
          }
        },
        requestedFile: null
      };
      
      // Check directories and list recent storyboard files
      if (diagnostics.directories.clientPublicImages.exists) {
        try {
          const files = fs.readdirSync(imageDir)
            .filter(file => file.startsWith('storyboard-') && file.endsWith('.png'))
            .map(file => {
              const filePath = path.join(imageDir, file);
              const stats = fs.statSync(filePath);
              return {
                name: file,
                size: stats.size,
                permissions: stats.mode.toString(8),
                modified: stats.mtime.toISOString(),
                url: `/images/${file}`,
                accessibleUrl: `${req.protocol}://${req.get('Host')}/images/${file}`
              };
            })
            .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
            .slice(0, 10); // Most recent 10 files
          
          diagnostics.directories.clientPublicImages.files = files;
        } catch (error) {
          diagnostics.directories.clientPublicImages.error = error.message;
        }
      }
      
      // If specific filename requested, check that file
      if (req.params.filename) {
        const filename = req.params.filename;
        const possiblePaths = [
          path.join(process.cwd(), 'client', 'public', 'images', filename),
          path.join(process.cwd(), 'public', 'images', filename),
          path.join(process.cwd(), 'images', filename),
          path.join(process.cwd(), 'server', '..', 'client', 'public', 'images', filename)
        ];
        
        diagnostics.requestedFile = {
          filename: filename,
          possiblePaths: possiblePaths.map(filePath => ({
            path: filePath,
            exists: fs.existsSync(filePath),
            stats: fs.existsSync(filePath) ? (() => {
              const stats = fs.statSync(filePath);
              return {
                size: stats.size,
                permissions: stats.mode.toString(8),
                modified: stats.mtime.toISOString()
              };
            })() : null
          }))
        };
      }
      
      console.log('[IMAGE DEBUG] Diagnostics compiled:', JSON.stringify(diagnostics, null, 2));
      res.json(diagnostics);
    });
    
    // General rate limiting - more permissive
    const generalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      limit: 1000, // Increased limit to prevent login issues
      standardHeaders: 'draft-7', // Use RFC 6585 standard headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      message: 'Too many requests from this IP, please try again after 15 minutes'
    });
    
    // Apply general rate limiting to all requests
    app.use(generalLimiter);
    
    // More strict rate limiting for authentication endpoints
    const authLimiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      limit: 10, // Limit each IP to 10 login/register attempts per hour
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: 'Too many authentication attempts from this IP, please try again after an hour'
    });
    
    // Apply stricter rate limiting to authentication endpoints
    app.use('/api/login', authLimiter);
    app.use('/api/register', authLimiter);
    app.use('/api/auth', authLimiter);
    
    log('[INFO] Rate limiting middleware initialized');
    
    // Body parsing middleware with increased limits for image uploads
    app.use(express.json({ limit: '5mb' }));
    app.use(express.urlencoded({ extended: false, limit: '5mb' }));
    log('[INFO] Body parsing middleware initialized with 5MB limit');

    try {
      // Session configuration
      app.use(session({
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
      }));
      log('[INFO] Session middleware initialized');
    } catch (err) {
      log('[ERROR] Failed to initialize session middleware:', String(err));
      throw err;
    }

    // Initialize passport
    app.use(passport.initialize());
    app.use(passport.session());
    log('[INFO] Passport initialized');

    // Setup authentication routes
    setupAuth(app);
    log('[INFO] Auth routes initialized');

    // Serve static images from client/public/images
    app.use('/images', express.static(path.join(process.cwd(), 'client', 'public', 'images'), {
      setHeaders: (res, filePath) => {
        console.log('[IMAGE SERVING] Serving file:', filePath);
        res.set('Cache-Control', 'public, max-age=86400'); // 24 hours
      }
    }));
    log('[INFO] Static image serving initialized');

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

    // Error handling for JSON parsing and payload size
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      if (err instanceof SyntaxError && 'body' in err) {
        log(`[ERROR] JSON parsing error: ${err.message}`);
        return res.status(400).json({ error: true, message: 'Invalid JSON' });
      }
      
      // Handle payload too large errors
      if (err && err.type === 'entity.too.large') {
        log(`[ERROR] Payload too large: ${err.message}`);
        return res.status(413).json({ 
          error: true, 
          message: 'Request entity too large. The maximum upload size is 5MB.'
        });
      }
      
      next(err);
    });

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

      // Health check endpoint will be added in routes.ts

      // API Error handling middleware with monitoring - must be after all routes
      app.use('/api', errorMonitoringMiddleware);
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

      log('[INFO] Attempting to start server on port', port.toString());
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
      log('[ERROR] Failed during server setup:', err instanceof Error ? err.message : String(err));
      throw err;
    }
  } catch (err) {
    log('[ERROR] Fatal error during server initialization:', err instanceof Error ? err.message : String(err));
    throw err;
  }
}

// Start the server
initializeServer().catch((err) => {
  console.error('[ERROR] Failed to start server:', err);
  process.exit(1);
});