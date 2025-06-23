# Blupi Staging Deployment Setup

## Overview
This guide sets up a proper staging environment that pulls from your main branch while keeping production mapped to the production branch.

## Step 1: Create Staging Replit Project

### Option A: Fork Current Project (Recommended)
1. Go to your current Blupi project in Replit
2. Click the three dots menu → "Fork"
3. Name it: `blupi-staging`
4. Set description: "Staging environment for Blupi"

### Option B: Import from Git Repository
1. Create new Replit project
2. Import from your main branch repository
3. Name: `blupi-staging`

## Step 2: Configure Git Integration

In your staging project:
1. Go to Version Control tab
2. Connect to your repository
3. Set branch to: `main` (this ensures staging pulls from main)
4. Enable auto-sync for continuous deployment

## Step 3: Environment Variables Configuration

Add these environment variables in Replit Secrets:

```bash
# Environment
NODE_ENV=staging
ENVIRONMENT=staging

# Database (create separate staging database)
DATABASE_URL=postgresql://staging_user:password@staging-host/blupi_staging

# Firebase Staging Project
VITE_FIREBASE_API_KEY=your_staging_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=blupi-staging.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=blupi-staging
VITE_FIREBASE_APP_ID=your_staging_firebase_app_id
FIREBASE_PROJECT_ID=blupi-staging
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-staging@blupi-staging.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_STAGING_PRIVATE_KEY\n-----END PRIVATE KEY-----"

# API Keys (can use same as production for testing)
VITE_GOOGLE_AI_API_KEY=your_google_ai_api_key
REPLICATE_API_TOKEN=your_replicate_api_token

# Staging Features
STAGING_BANNER_ENABLED=true
DEBUG_MODE=true
RATE_LIMIT_ENABLED=false
```

## Step 4: Deploy Staging Environment

1. In your staging Replit project, click "Deploy"
2. Choose deployment name: `blupi-staging`
3. Wait for deployment to complete
4. Note the deployment URL (e.g., `blupi-staging.username.repl.co`)

## Step 5: Custom Domain Configuration

### Get Deployment Details
Once deployed, Replit will provide:
- **Deployment URL**: `https://blupi-staging.username.repl.co`
- **CNAME Target**: `username.repl.co` (for custom domain)

### Configure staging.blupi.io in Squarespace
1. Log into Squarespace Domain Management
2. Go to DNS Settings
3. Add CNAME record:
   - **Host**: `staging`
   - **Points to**: `username.repl.co` (replace with your actual Replit username)
   - **TTL**: 3600 (1 hour)

### Alternative: A Record (if CNAME doesn't work)
If Squarespace requires an A record:
1. Get the IP address of your Replit deployment:
   ```bash
   nslookup blupi-staging.username.repl.co
   ```
2. Add A record:
   - **Host**: `staging`
   - **Points to**: `[IP address from nslookup]`
   - **TTL**: 3600

## Step 6: Verify Staging Deployment

### DNS Propagation Check
```bash
# Check if DNS is working
nslookup staging.blupi.io

# Test HTTPS access
curl -I https://staging.blupi.io
```

### Staging Environment Verification
1. Visit `https://staging.blupi.io`
2. Verify staging banner appears
3. Test authentication flow
4. Create test board
5. Verify database isolation

## Step 7: Update Firebase Configuration

1. Go to Firebase Console → blupi-staging project
2. Add authorized domains:
   - `staging.blupi.io`
   - `blupi-staging.username.repl.co`
3. Update OAuth redirect URIs to include staging domain

## Production Branch Mapping

Ensure your production deployment remains mapped to the `production` branch:

1. Go to production Replit project
2. Version Control → Set branch to `production`
3. Verify production deployment pulls from correct branch

## Continuous Deployment Workflow

### Main Branch → Staging
- All commits to `main` automatically deploy to staging
- Test features and bug fixes in staging environment
- Verify functionality before promoting to production

### Production Branch → Production  
- Merge main into production when ready to release
- Production deployment automatically updates
- Maintains stable production environment

## DNS Configuration Summary

For your DNS configuration in Squarespace:

**CNAME Record for staging.blupi.io:**
```
Type: CNAME
Host: staging
Points to: [your-replit-username].repl.co
TTL: 3600
```

**Note**: Replace `[your-replit-username]` with your actual Replit username. The exact CNAME target will be provided after you deploy your staging environment.

## Testing and Validation

### Automated Tests
```bash
# Run in staging environment
npm run test:staging
npm run test:e2e:staging
```

### Manual Testing Checklist
- [ ] Staging banner visible
- [ ] Authentication works
- [ ] Database operations function
- [ ] AI features operational
- [ ] Real-time collaboration active
- [ ] Custom domain accessible

## Maintenance

### Weekly Tasks
1. Sync main branch with latest changes
2. Run full test suite in staging
3. Verify all integrations working
4. Check staging database health

### Before Production Releases
1. Deploy to staging first
2. Run comprehensive tests
3. Verify all features work
4. Get team approval
5. Merge to production branch

Your staging environment is now configured to automatically deploy from the main branch while production remains stable on the production branch.