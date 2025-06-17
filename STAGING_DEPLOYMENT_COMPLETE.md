# Blupi Staging Environment - Complete Setup Guide

Your staging environment is now fully configured with all necessary files and scripts. This document provides the complete process to deploy your staging environment.

## Files Created

- `STAGING_SETUP_GUIDE.md` - Comprehensive setup documentation
- `STAGING_ENV_VARIABLES.txt` - Environment variables template
- `FIREBASE_STAGING_SETUP.md` - Firebase project setup steps
- `DATABASE_STAGING_SETUP.md` - Database configuration guide
- `REPLIT_STAGING_CONFIG.md` - Replit-specific configuration
- `config/environment.ts` - Environment-aware configuration system
- `client/src/components/environment-banner.tsx` - Staging visual indicators
- `scripts/setup-staging.sh` - Automated setup script
- `scripts/verify-staging.sh` - Configuration verification script

## Quick Start (30 minutes)

### 1. Create Staging Replit Project (5 minutes)
- Fork your current Blupi project in Replit
- Rename to "blupi-staging"
- This creates a complete copy with all code

### 2. Set Up Staging Firebase Project (10 minutes)
- Visit [Firebase Console](https://console.firebase.google.com/)
- Create new project: "blupi-staging"
- Enable Authentication with Google, Email/Password, and Magic Link
- Add web app: "blupi-staging-web"
- Download service account key
- Add staging domain to authorized domains

### 3. Create Staging Database (5 minutes)
**Option A: New Neon Project**
- Go to [Neon Console](https://console.neon.tech/)
- Create project: "blupi-staging"
- Copy connection string

**Option B: New Database in Existing Project**
- Create new database: "blupi_staging"
- Update connection string with new database name

### 4. Configure Environment Variables (10 minutes)
In your staging Replit project Secrets, add all variables from `STAGING_ENV_VARIABLES.txt`:

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
VITE_GOOGLE_AI_API_KEY=your_google_ai_key
STAGING_BANNER_ENABLED=true
DEBUG_MODE=true
```

## Verification Process

### Run Verification Script
```bash
./scripts/verify-staging.sh
```

This checks:
- Environment configuration
- Database connectivity
- Firebase authentication setup
- All required environment variables

### Manual Testing Checklist
- [ ] Application starts without errors
- [ ] Staging banner appears at top of page
- [ ] Google OAuth login works
- [ ] Email/password registration works
- [ ] Magic link authentication works
- [ ] Create test board successfully
- [ ] Real-time collaboration functions
- [ ] Data persists to staging database

## Deployment

### Deploy Staging Environment
1. In staging Replit project, click "Deploy"
2. Choose deployment name: "blupi-staging"
3. Configure custom domain if desired
4. Deploy and test live staging URL

### Update Firebase OAuth Settings
After deployment:
1. Add live staging URL to Firebase authorized domains
2. Update OAuth redirect URIs
3. Test authentication flows on live staging site

## Staging Environment Features

### Visual Indicators
- Orange "STAGING ENVIRONMENT" banner at top
- Environment badge in corner showing "STAGING"
- Debug logging enabled in console

### Isolated Data
- Completely separate database from production
- Independent user accounts and authentication
- No access to production data

### Safety Features
- Relaxed rate limiting for testing
- Debug mode enabled
- Test data creation allowed
- Separate Firebase project prevents production interference

## Maintenance

### Keeping Staging Updated
1. Regularly merge changes from production repository
2. Test new features in staging before production deployment
3. Run database migrations in staging first
4. Monitor staging performance and error rates

### Data Management
- Reset staging database safely as needed
- Create test data scripts for consistent testing
- Document test scenarios and user flows
- Regular cleanup of old test data

## Team Workflow

### Development Process
1. Develop features locally
2. Test in staging environment
3. Verify with team members
4. Deploy to production after approval

### Access Control
- Share staging URL with team members only
- Use staging for client demos and testing
- Keep staging credentials secure but accessible to team

## Troubleshooting

### Common Issues and Solutions

**Authentication Errors**
- Verify Firebase project configuration
- Check authorized domains include staging URL
- Validate service account keys are correct

**Database Connection Issues**
- Confirm DATABASE_URL format is correct
- Verify database exists and is accessible
- Check Neon project permissions

**Environment Variable Problems**
- Restart Replit after adding new secrets
- Verify variable names match exactly (case-sensitive)
- Check for extra spaces or characters in values

**Build or Runtime Errors**
- Check console logs for specific error messages
- Verify all dependencies are installed
- Ensure environment variables are properly formatted

## Support Resources

- Staging setup documentation in project files
- Firebase Console for authentication management
- Neon Console for database administration
- Replit support for deployment issues

## Next Steps After Staging Setup

1. **Automated Testing**: Set up automated test suite for staging
2. **Monitoring**: Configure error tracking and performance monitoring
3. **CI/CD Pipeline**: Automate deployment from git repository
4. **Documentation**: Document staging-specific testing procedures
5. **Team Training**: Train team members on staging workflow

Your staging environment provides complete isolation from production while maintaining full feature parity, enabling safe testing and development of new features before production deployment.