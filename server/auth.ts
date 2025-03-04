import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import { insertUserSchema } from "@shared/schema";
import type { Express, Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

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
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Invalid email or password" });
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
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
      res.json({ message: "Logged out successfully" });
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
}