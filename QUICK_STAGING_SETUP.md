# Quick Staging Setup for Blupi

## Step 1: Create Staging Project (5 minutes)

1. **Fork your current Replit project**
   - Go to your current Blupi project
   - Click three dots → "Fork"
   - Name: `blupi-staging`

2. **Configure Git branch**
   - In staging project, go to Version Control tab
   - Set branch to: `main`
   - Enable auto-sync

## Step 2: Environment Variables (10 minutes)

Add these to Replit Secrets in your staging project:

```bash
NODE_ENV=staging
ENVIRONMENT=staging
STAGING_BANNER_ENABLED=true
DEBUG_MODE=true

# Create separate staging database
DATABASE_URL=postgresql://[your-staging-db-url]

# Create staging Firebase project
VITE_FIREBASE_API_KEY=[staging-api-key]
VITE_FIREBASE_AUTH_DOMAIN=blupi-staging.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=blupi-staging
VITE_FIREBASE_APP_ID=[staging-app-id]
FIREBASE_PROJECT_ID=blupi-staging
FIREBASE_CLIENT_EMAIL=[staging-service-account-email]
FIREBASE_PRIVATE_KEY=[staging-private-key]

# Same API keys as production for testing
VITE_GOOGLE_AI_API_KEY=[your-google-ai-key]
REPLICATE_API_TOKEN=[your-replicate-token]
```

## Step 3: Deploy Staging (5 minutes)

1. Click "Deploy" in your staging project
2. Deployment name: `blupi-staging`
3. Wait for deployment completion
4. **Note the deployment URL**: `https://blupi-staging.[username].repl.co`

## Step 4: DNS Configuration in Squarespace (5 minutes)

1. **Log into Squarespace**
2. **Go to Settings → Domains → DNS Settings**
3. **Add CNAME Record:**
   ```
   Type: CNAME
   Host: staging
   Points to: [username].repl.co
   TTL: 3600
   ```
   Replace `[username]` with your actual Replit username from the deployment URL

## Step 5: Firebase Configuration (5 minutes)

1. **Create staging Firebase project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create project: `blupi-staging`
   - Enable Authentication (Google, Email/Password)

2. **Add authorized domains:**
   - `staging.blupi.io`
   - `blupi-staging.[username].repl.co`

## DNS Configuration Details

After deployment, you'll get a URL like: `https://blupi-staging.johndoe.repl.co`

**Your CNAME record should be:**
- **Host**: `staging` 
- **Points to**: `johndoe.repl.co` (without https://)

This will make `staging.blupi.io` point to your staging deployment.

## Verification

1. **Test DNS**: `nslookup staging.blupi.io`
2. **Visit site**: `https://staging.blupi.io`
3. **Check for orange staging banner**
4. **Test authentication and basic functionality**

## Production Branch Mapping

Your production deployment should remain on the `production` branch:
1. Go to production Replit project
2. Version Control → Set branch to `production`
3. This keeps production stable while staging pulls from main

## Workflow

- **Main branch** → Auto-deploys to staging
- **Production branch** → Auto-deploys to production
- Test in staging before merging main → production

The staging environment will automatically update when you push to the main branch, providing a safe testing environment before production releases.