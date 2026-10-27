import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import type { Express, Request, Response } from "express";

// Email/password and Google sign-in. A signed-in session stores the database
// user ID as a string in req.session.userId, which the rest of the API reads.

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function verifyPassword(supplied: string, stored: string) {
  // Google-only accounts have no password
  if (!stored) return false;
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) return false;
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return hashedBuf.length === suppliedBuf.length && timingSafeEqual(hashedBuf, suppliedBuf);
}

const MIN_PASSWORD_LENGTH = 8;

function normalizeEmail(email: unknown) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function displayNameFor(user: User) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return fullName || user.username || user.email.split("@")[0];
}

// Shape the client's useAuth() hook expects
function toClientUser(user: User) {
  return {
    uid: user.id,
    email: user.email,
    displayName: displayNameFor(user),
    photoURL: user.profileImageUrl || null,
  };
}

// Regenerate the session on sign-in so a pre-login session ID can't be reused
function startSession(req: Request, user: User): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = String(user.id);
      req.session.email = user.email;
      req.session.displayName = displayNameFor(user);
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

// Usernames must be unique; derive one from the email and add a suffix if taken
async function uniqueUsername(email: string) {
  const base = email.split("@")[0].replace(/[^a-zA-Z0-9._-]/g, "") || "user";
  let candidate = base;
  for (let i = 0; i < 5; i++) {
    if (!(await storage.getUserByUsername(candidate))) return candidate;
    candidate = `${base}${randomBytes(2).toString("hex")}`;
  }
  return `${base}${randomBytes(4).toString("hex")}`;
}

// Projects and boards live inside an organization, so every new account gets
// its own workspace to start in
async function createPersonalWorkspace(user: User) {
  const name = `${displayNameFor(user)}'s Workspace`;
  const slug = `${user.username.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${randomBytes(3).toString("hex")}`;
  const org = await storage.createOrganization({ name, slug });
  await storage.addUserToOrganization(user.id, org.id, "owner");
  await storage.setActiveOrganization(user.id, org.id);
}

function googleRedirectUri(req: Request) {
  return process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get("host")}/auth/google-callback`;
}

export function setupAuth(app: Express) {
  app.get("/api/auth/session", async (req: Request, res: Response) => {
    const userId = parseInt(req.session?.userId ?? "", 10);
    if (isNaN(userId)) {
      return res.status(401).json({ error: true, message: "Not authenticated" });
    }
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: true, message: "Not authenticated" });
      }
      res.json({ user: toClientUser(user) });
    } catch (err) {
      console.error("[Auth] Session check failed:", err);
      res.status(500).json({ error: true, message: "Could not check session" });
    }
  });

  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const email = normalizeEmail(req.body?.email);
      const password = typeof req.body?.password === "string" ? req.body.password : "";

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: true, message: "Please enter a valid email address" });
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({
          error: true,
          message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        });
      }

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        const message = existing.password
          ? "An account with this email already exists. Please sign in instead."
          : "This email is already registered with Google. Please use “Sign in with Google”.";
        return res.status(400).json({ error: true, message });
      }

      const user = await storage.createUser({
        email,
        username: await uniqueUsername(email),
        password: await hashPassword(password),
      });
      await createPersonalWorkspace(user);

      await startSession(req, user);
      res.json({ success: true, user: toClientUser(user) });
    } catch (err) {
      console.error("[Auth] Sign up failed:", err);
      res.status(500).json({ error: true, message: "Sign up failed. Please try again." });
    }
  });

  app.post("/api/auth/signin", async (req: Request, res: Response) => {
    try {
      const email = normalizeEmail(req.body?.email);
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      if (!email || !password) {
        return res.status(400).json({ error: true, message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (user && !user.password && user.googleId) {
        return res.status(401).json({
          error: true,
          message: "This account uses Google sign-in. Please use “Sign in with Google”.",
        });
      }
      if (!user || !(await verifyPassword(password, user.password))) {
        return res.status(401).json({ error: true, message: "Invalid email or password" });
      }

      await startSession(req, user);
      res.json({ success: true, user: toClientUser(user) });
    } catch (err) {
      console.error("[Auth] Sign in failed:", err);
      res.status(500).json({ error: true, message: "Sign in failed. Please try again." });
    }
  });

  // Local development only: one-click sign-in as DEV_LOGIN_EMAIL, creating the
  // account if it doesn't exist. Never registered in production.
  const devLoginEmail = normalizeEmail(process.env.DEV_LOGIN_EMAIL);
  if (process.env.NODE_ENV !== "production" && devLoginEmail) {
    console.warn(`[Auth] Dev sign-in enabled for ${devLoginEmail} at /api/auth/dev-login`);
    app.get("/api/auth/dev-login", async (req: Request, res: Response) => {
      try {
        let user = await storage.getUserByEmail(devLoginEmail);
        if (!user) {
          user = await storage.createUser({
            email: devLoginEmail,
            username: await uniqueUsername(devLoginEmail),
            password: await hashPassword(process.env.DEV_LOGIN_PASSWORD || randomBytes(16).toString("hex")),
          });
          await createPersonalWorkspace(user);
        }
        await startSession(req, user);
        res.redirect("/");
      } catch (err) {
        console.error("[Auth] Dev sign-in failed:", err);
        res.status(500).json({ error: true, message: "Dev sign-in failed" });
      }
    });
  }

  app.post("/api/auth/signout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  // Google sign-in: redirect to Google, which sends the user back to /auth/google-callback
  app.get("/api/auth/google", (req: Request, res: Response) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error("[Auth] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set");
      return res.redirect("/auth/login?error=google_not_configured");
    }

    // Random state ties the callback to this browser session (CSRF protection)
    const state = randomBytes(16).toString("hex");
    req.session.oauthState = state;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: googleRedirectUri(req),
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });
    req.session.save(() => {
      res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
    });
  });

  app.get("/auth/google-callback", async (req: Request, res: Response) => {
    const fail = (reason: string) => res.redirect(`/auth/login?error=${reason}`);
    try {
      const { code, state, error } = req.query;
      const expectedState = req.session.oauthState;
      delete req.session.oauthState;

      if (error) return fail("google_cancelled");
      if (typeof code !== "string") return fail("google_failed");
      if (!expectedState || state !== expectedState) return fail("google_state_mismatch");

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID || "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
          redirect_uri: googleRedirectUri(req),
          grant_type: "authorization_code",
        }),
      });
      if (!tokenResponse.ok) {
        console.error("[Auth] Google token exchange failed:", await tokenResponse.text());
        return fail("google_failed");
      }

      const tokens = await tokenResponse.json();
      if (!tokens.id_token) return fail("google_failed");

      // The ID token came straight from Google's token endpoint over TLS using our
      // client secret, so per the OpenID Connect spec we check its claims rather
      // than its signature.
      const claims = JSON.parse(Buffer.from(tokens.id_token.split(".")[1], "base64url").toString());
      const validIssuer = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
      if (!validIssuer || claims.aud !== process.env.GOOGLE_CLIENT_ID || claims.exp * 1000 < Date.now()) {
        console.error("[Auth] Google ID token failed validation");
        return fail("google_failed");
      }
      if (!claims.email || claims.email_verified !== true) return fail("google_email_unverified");

      const googleId: string = claims.sub;
      const email = normalizeEmail(claims.email);

      let user = await storage.getUserByGoogleId(googleId);
      if (!user) {
        const existing = await storage.getUserByEmail(email);
        if (existing) {
          // Same verified email as an email/password account: link them
          user = await storage.updateUser(existing.id, {
            googleId,
            profileImageUrl: existing.profileImageUrl || claims.picture || null,
          });
        } else {
          user = await storage.createUser({
            email,
            username: await uniqueUsername(email),
            password: "",
            firstName: claims.given_name || null,
            lastName: claims.family_name || null,
            profileImageUrl: claims.picture || null,
            googleId,
          });
          await createPersonalWorkspace(user);
        }
      }

      await startSession(req, user);
      res.redirect("/");
    } catch (err) {
      console.error("[Auth] Google callback failed:", err);
      fail("google_failed");
    }
  });

  return app;
}
