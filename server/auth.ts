import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import { insertUserSchema } from "@shared/schema";
import type { Express, Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { isDevelopment } from "../config/environment";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      username: string;
      password: string;
      createdAt: Date;
    }
  }
}

export function setupAuth(app: Express) {
  // Add session check middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.session) {
      console.error('[Auth] No session found');
      return next(new Error('No session found'));
    }
    next();
  });

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          console.log('[Auth] Attempting login for:', email);
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            console.log('[Auth] Invalid credentials for:', email);
            return done(null, false, { message: "Invalid email or password" });
          }
          console.log('[Auth] Login successful for:', email);
          return done(null, user);
        } catch (err) {
          console.error('[Auth] Login error:', err);
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    console.log('[Auth] Serializing user:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('[Auth] Deserializing user:', id);
      const user = await storage.getUser(id);
      if (!user) {
        console.error('[Auth] User not found during deserialization:', id);
        return done(null, false);
      }
      done(null, user);
    } catch (err) {
      console.error('[Auth] Deserialization error:', err);
      done(err);
    }
  });

  // Update the auth check endpoint to handle Firebase tokens and anonymous users
  app.get("/api/auth/check", (req: Request, res: Response) => {
    console.log('[Auth] Checking auth status');
    if (!req.session) {
      console.error('[Auth] No session found during auth check');
      return res.status(401).json({ 
        error: true,
        message: "No session found" 
      });
    }

    // Support for development bypass mode and anonymous/guest users from Firebase
    const isGuestUser = req.headers['x-guest-user'] === 'true';
    const isDevBypass = req.headers['x-dev-bypass'] === 'true' && isDevelopment();
    
    if (!req.user && !isGuestUser && !isDevBypass) {
      console.log('[Auth] No user found during auth check');
      return res.status(401).json({ 
        error: true,
        message: "Not authenticated" 
      });
    }

    if (isDevBypass && isDevelopment()) {
      console.log('[Auth] Development bypass mode activated');
      return res.json({
        authenticated: true,
        user: {
          id: 999, // Dev bypass uses a special ID
          email: 'dev@example.com',
          username: 'Development User'
        },
        isDev: true
      });
    }
    
    if (isGuestUser) {
      console.log('[Auth] Guest user authenticated');
      return res.json({
        authenticated: true,
        user: {
          id: 0, // Guest users use a special ID
          email: 'guest@example.com',
          username: 'Guest User'
        },
        isGuest: true
      });
    }

    if (req.user) {
      console.log('[Auth] User authenticated:', req.user.id);
      res.json({ 
        authenticated: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          username: req.user.username
        },
        isGuest: false
      });
    } else {
      console.log('[Auth] No authenticated user found');
      return res.status(401).json({ 
        error: true,
        message: "Not authenticated" 
      });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    console.log('[Auth] Logging out user');
    req.logout((err) => {
      if (err) {
        console.error('[Auth] Logout error:', err);
        return res.status(500).json({ error: true, message: "Logout failed" });
      }
      req.session.destroy((err) => {
        if (err) {
          console.error('[Auth] Session destruction error:', err);
          return res.status(500).json({ error: true, message: "Session destruction failed" });
        }
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  app.post("/api/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parseResult = insertUserSchema.safeParse(req.body);

      if (!parseResult.success) {
        return res.status(400).json({ 
          error: true,
          message: parseResult.error.errors[0].message 
        });
      }

      // Check if user exists
      const existingUser = await storage.getUserByEmail(parseResult.data.email);
      if (existingUser) {
        return res.status(400).json({ 
          error: true,
          message: "Email already registered" 
        });
      }

      // Create new user
      const hashedPassword = await hashPassword(parseResult.data.password);
      const user = await storage.createUser({
        ...parseResult.data,
        password: hashedPassword,
      });

      // Log user in
      req.login(user, (err) => {
        if (err) return next(err);
        return res.json(user);
      });
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: true,
          message: err.errors[0].message
        });
      }
      next(err);
    }
  });

  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: Error | null, user: User | false, info?: { message: string }) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ 
          error: true,
          message: info?.message || "Invalid credentials" 
        });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ error: true, message: "Logout failed" });
      req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: true, message: "Session destruction failed" });
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: true,
        message: "Not authenticated" 
      });
    }
    res.json(req.user);
  });
  return app;
}