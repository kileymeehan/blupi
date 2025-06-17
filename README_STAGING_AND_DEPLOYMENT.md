# Blupi Staging and Production Deployment Guide

This guide covers how to use your staging environment and deploy to production for the Blupi collaborative design platform.

## Table of Contents
- [Staging Environment Setup](#staging-environment-setup)
- [Using Staging Environment](#using-staging-environment)
- [Production Deployment](#production-deployment)
- [Daily Workflow](#daily-workflow)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

## Staging Environment Setup

### One-Time Setup Process

#### 1. Create Staging Project
- Fork your current Blupi project in Replit
- Rename to "blupi-staging"
- This creates a complete copy with all code

#### 2. Set Up Staging Firebase Project
- Visit [Firebase Console](https://console.firebase.google.com/)
- Create new project: "blupi-staging"
- Enable Authentication (Google, Email/Password, Magic Link)
- Add web app: "blupi-staging-web"
- Download service account key
- Add staging domain to authorized domains

#### 3. Create Staging Database
**Option A: New Neon Project**
- Go to [Neon Console](https://console.neon.tech/)
- Create project: "blupi-staging"
- Copy connection string

**Option B: New Database in Existing Project**
- Create new database: "blupi_staging"
- Update connection string with new database name

#### 4. Configure Environment Variables
Add these secrets in your staging Replit project:

```
NODE_ENV=staging
ENVIRONMENT=staging
DATABASE_URL=your_staging_database_url
VITE_FIREBASE_API_KEY=your_staging_api_key
VITE_FIREBASE_AUTH_DOMAIN=blupi-staging.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=blupi-staging
VITE_FIREBASE_APP_ID=your_staging_app_id
FIREBASE_PROJECT_ID=blupi-staging
FIREBASE_CLIENT_EMAIL=your_staging_service_account_email
FIREBASE_PRIVATE_KEY=your_staging_private_key
STAGING_BANNER_ENABLED=true
DEBUG_MODE=true
```

## Using Staging Environment

### Starting Staging
1. Open your "blupi-staging" Replit project
2. Click "Run" or use the console to start the application
3. Look for the orange "STAGING ENVIRONMENT" banner at the top

### Testing Features
- Create test boards and components
- Test authentication flows (Google OAuth, magic links)
- Verify real-time collaboration
- Check database persistence
- Test with team members using staging URL

### Visual Indicators
- Orange banner showing "STAGING ENVIRONMENT - Test data only"
- Environment badge in corner showing "STAGING"
- Debug logging enabled in browser console

### Verification Commands
Check environment configuration:
```bash
npm run test:env
```

Verify staging setup:
```bash
./scripts/verify-staging.sh
```

## Production Deployment

### Deploy Current Production
1. Go to your main (production) Blupi project in Replit
2. Click "Deploy" in the top navigation bar
3. Choose deployment name (e.g., "blupi-production")
4. Configure custom domain if desired
5. Click "Deploy" - Replit handles building, hosting, SSL, and health checks

### Deploy Staging Changes to Production
When ready to promote tested changes:
1. Copy approved changes from staging project to main project
2. Ensure production environment variables are configured
3. Run the deployment process above
4. Test production deployment thoroughly

### Production Environment Variables
Your production project should have:
```
NODE_ENV=production
DATABASE_URL=your_production_database_url
VITE_FIREBASE_API_KEY=your_production_api_key
VITE_FIREBASE_AUTH_DOMAIN=blupi-458414.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=blupi-458414
VITE_FIREBASE_APP_ID=your_production_app_id
FIREBASE_PROJECT_ID=blupi-458414
FIREBASE_CLIENT_EMAIL=your_production_service_account_email
FIREBASE_PRIVATE_KEY=your_production_private_key
```

## Daily Workflow

### Development Process
1. **Develop** - Make changes in staging project
2. **Test** - Verify functionality in staging environment
3. **Review** - Share staging URL with team for approval
4. **Deploy** - Copy approved changes to production and deploy

### Feature Development
1. Implement new features in staging
2. Test all authentication methods
3. Verify database operations
4. Test real-time collaboration features
5. Get team approval
6. Promote to production

### Bug Fixes
1. Reproduce issue in staging
2. Implement and test fix
3. Verify fix doesn't break existing functionality
4. Deploy fix to production

## Environment Variables

### Required for Staging
| Variable | Description | Example |
|----------|-------------|---------|
| NODE_ENV | Environment type | staging |
| ENVIRONMENT | Custom environment identifier | staging |
| DATABASE_URL | Staging database connection | postgresql://... |
| VITE_FIREBASE_* | Firebase client configuration | Various Firebase values |
| FIREBASE_* | Firebase admin configuration | Service account details |
| STAGING_BANNER_ENABLED | Show staging banner | true |
| DEBUG_MODE | Enable debug logging | true |

### Required for Production
| Variable | Description | Example |
|----------|-------------|---------|
| NODE_ENV | Environment type | production |
| DATABASE_URL | Production database connection | postgresql://... |
| VITE_FIREBASE_* | Firebase client configuration | Production Firebase values |
| FIREBASE_* | Firebase admin configuration | Production service account |

## Environment Differences

### Staging Features
- Orange "STAGING ENVIRONMENT" banner
- Debug mode enabled
- Relaxed rate limiting
- Test data allowed
- Separate user base
- Independent database

### Production Features
- Clean interface without banners
- Optimized performance
- Standard rate limiting
- Live user data
- Production database
- Error reporting enabled

## Safety Features

### Data Isolation
- Staging and production use completely separate databases
- Different Firebase projects prevent authentication conflicts
- No access to production data from staging

### Visual Indicators
- Clear environment identification
- Staging banner prevents confusion
- Environment badges show current context

### Testing Safety
- Safe to reset staging database
- Independent user accounts
- Separate API quotas and limits

## Troubleshooting

### Authentication Issues
- Verify Firebase project configuration
- Check authorized domains include staging URL
- Validate service account keys

### Database Connection Problems
- Confirm DATABASE_URL format
- Verify database exists and is accessible
- Check network connectivity

### Environment Variable Issues
- Restart Replit after adding secrets
- Verify variable names match exactly
- Check for extra spaces or characters

### Deployment Problems
- Check console logs for errors
- Verify all required environment variables
- Ensure Firebase domains are authorized

## Quick Reference Commands

```bash
# Check environment configuration
npm run test:env

# Verify staging setup
./scripts/verify-staging.sh

# Run staging environment
npm run dev

# Push database schema
npm run db:push
```

## Support Resources

- `STAGING_SETUP_GUIDE.md` - Comprehensive setup documentation
- `FIREBASE_STAGING_SETUP.md` - Firebase configuration details  
- `DATABASE_STAGING_SETUP.md` - Database setup instructions
- `STAGING_ENV_VARIABLES.txt` - Environment variables template

## Best Practices

### Code Management
- Always test changes in staging first
- Keep staging synchronized with latest code
- Document changes and testing procedures

### Database Management
- Run migrations in staging before production
- Create test data scripts for consistent testing
- Regular cleanup of staging data

### Team Collaboration
- Share staging URL for feature reviews
- Use staging for client demonstrations
- Coordinate deployments with team

### Security
- Keep staging credentials separate from production
- Regularly rotate service account keys
- Monitor both environments for security issues

This workflow ensures safe feature development and reliable production deployments while maintaining complete data isolation between environments.