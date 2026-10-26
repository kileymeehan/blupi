# Deploying Blupi on Railway

Railway hosts both the app and its Postgres database. Sign-in is handled by
Blupi itself (email/password or Google), with no Firebase. Build and start
settings live in `railway.json`, and `package.json` pins Node 22.

> **Don't cancel Replit yet.** Your existing projects live in Replit's database.
> Copy the data over first (step 6), check it, *then* cancel.

## 1. Create the project

1. Push this repo to GitHub.
2. Go to railway.com → **New Project** → **Deploy from GitHub repo** → pick the repo.
3. In the same project: **+ Create** → **Database** → **PostgreSQL**.

## 2. Get a public URL

App service → **Settings** → **Networking** → **Generate Domain**.
You'll get something like `blupi-production.up.railway.app`. You need it for step 3.

## 3. Set up Google sign-in

In [Google Cloud Console](https://console.cloud.google.com/), project `blupi-458414`:

1. **APIs & Services** → **OAuth consent screen**: make sure it's configured
   (app name, support email). Set it to **In production** so anyone can sign in.
2. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**
   → type **Web application**.
3. Under **Authorized redirect URIs**, add:
   - `https://<your-railway-domain>/auth/google-callback`
   - `http://localhost:5000/auth/google-callback` (for local dev)
   - Your custom domain's callback too, if you have one (e.g. `https://my.blupi.io/auth/google-callback`)
4. Copy the **Client ID** and **Client secret**.

## 4. Set environment variables

Open the app service → **Variables** and add:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (type it exactly; Railway links it to the database) |
| `DATABASE_SSL` | `false` |
| `SESSION_SECRET` | Output of `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NODE_ENV` | `production` |
| `GOOGLE_CLIENT_ID` | From step 3 |
| `GOOGLE_CLIENT_SECRET` | From step 3 |

Then add any optional keys from `.env.example` (OpenAI, SendGrid, etc.).

## 5. Keep uploaded files

Uploaded logos are written to the `uploads/` folder, which Railway wipes on every
deploy unless it lives on a volume.

App service → **Settings** → **Volumes** → **Add Volume** → mount path `/app/uploads`.

## 6. Create the tables and bring over your projects

You'll need two connection strings:

- **New (Railway):** Postgres service → **Variables** → `DATABASE_PUBLIC_URL`
- **Old (Replit):** your Replit project → **Secrets** (padlock icon) → `DATABASE_URL`

Then, in this folder:

```bash
# Create the tables in the Railway database
DATABASE_URL="<Railway DATABASE_PUBLIC_URL>" npm run db:push

# Preview what will be copied (writes nothing)
SOURCE_DATABASE_URL="<Replit DATABASE_URL>" \
DATABASE_URL="<Railway DATABASE_PUBLIC_URL>" \
OWNER_EMAIL="you@example.com" \
node scripts/migrate-from-replit.mjs

# Run it for real
SOURCE_DATABASE_URL="<Replit DATABASE_URL>" \
DATABASE_URL="<Railway DATABASE_PUBLIC_URL>" \
OWNER_EMAIL="you@example.com" \
node scripts/migrate-from-replit.mjs --apply
```

What the migration does:

- **Copies** workspaces, projects, boards and sheet documents.
- **Doesn't copy** user accounts, team members, invitations, notifications,
  comments, flagged blocks or board permissions.
- **Assigns** every project and board to `OWNER_EMAIL`. Sign in with Google using
  that address. Add `OWNER_PASSWORD="..."` to the command if you also want
  email/password sign-in.
- Only runs against an empty Railway database, so running it twice can't
  create duplicates. If anything fails, nothing is written.

To re-run `db:push` later after changing `shared/schema.ts`, use the same Railway URL.

## Check it's working

Visit `https://<your-domain>/api/health`. Railway also uses this path as its
health check, so a failed deploy will show up in the **Deployments** tab.

## Local development

Use **Node 22**. A Google Sheets dependency crashes on Node 25+. With Homebrew:
`brew install node@22`, then follow the PATH instructions it prints.

Copy `.env.example` to `.env`. Point `DATABASE_URL` at the Railway database's
`DATABASE_PUBLIC_URL` with `DATABASE_SSL=true` (or at a local Postgres), then:

```bash
npm run dev   # http://localhost:5000
```
