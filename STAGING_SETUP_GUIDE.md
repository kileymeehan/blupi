# Blupi Staging Environment Setup Guide

This guide will help you create a complete staging environment for your Blupi project with separate databases, Firebase projects, and deployment URLs.

## Overview

Your staging environment will include:
- Separate Replit project
- Independent Firebase project for authentication
- Isolated PostgreSQL database
- Unique environment variables
- Independent deployment URL

## Step 1: Create New Replit Project

1. **Fork/Duplicate Your Current Project**
   - Go to your current Blupi project in Replit
   - Click the three dots menu → "Fork" 
   - Name it `blupi-staging`
   - This creates a complete copy of your codebase

## Step 2: Set Up Staging Firebase Project

### Create New Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" 
3. Project name: `blupi-staging`
4. Enable Google Analytics (optional)
5. Choose or create Analytics account

### Configure Authentication
1. In Firebase Console → Authentication → Sign-in method
2. Enable the same providers as production:
   - Google (configure OAuth consent screen)
   - Email/Password
   - Email link (passwordless)

### Get Firebase Configuration
1. Go to Project Settings → General tab
2. Scroll to "Your apps" section
3. Click "Add app" → Web app
4. App name: `blupi-staging-web`
5. Copy the configuration object

## Step 3: Configure Staging Database

### Option A: New Neon Database (Recommended)
1. Go to [Neon Console](https://console.neon.tech/)
2. Create new project: `blupi-staging`
3. Copy the connection string

### Option B: Separate Database in Same Project
1. In your existing Neon project
2. Create new database: `blupi_staging`
3. Update connection string to use new database name

## Step 4: Environment Variables Setup

Add these environment variables to your staging Replit project:

### Database Configuration
```
DATABASE_URL=<your_staging_database_url>
```

### Firebase Configuration (Staging)
```
VITE_FIREBASE_API_KEY=<staging_firebase_api_key>
VITE_FIREBASE_AUTH_DOMAIN=<staging_project_id>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<staging_project_id>
VITE_FIREBASE_APP_ID=<staging_app_id>

FIREBASE_PROJECT_ID=<staging_project_id>
FIREBASE_CLIENT_EMAIL=<staging_service_account_email>
FIREBASE_PRIVATE_KEY=<staging_service_account_private_key>
```

### API Keys (Can reuse or create new)
```
VITE_GOOGLE_AI_API_KEY=<your_google_ai_api_key>
```

### Environment Identifier
```
NODE_ENV=staging
ENVIRONMENT=staging
```

## Step 5: Update Application Configuration

The staging environment will automatically use environment-specific configurations through the existing environment variable system.

## Step 6: Database Migration

Run these commands in your staging project:

```bash
npm run db:push
```

This will:
- Create all tables in your staging database
- Apply the current schema
- Set up the database structure

## Step 7: Testing Your Staging Environment

1. **Start the application**
   ```bash
   npm run dev
   ```

2. **Verify Firebase Authentication**
   - Test Google OAuth login
   - Test email/password registration
   - Test magic link authentication

3. **Test Core Features**
   - Create a test board
   - Add some blocks/components
   - Test real-time collaboration
   - Verify data persistence

## Step 8: Deploy Staging Environment

1. **In your staging Replit project**
   - Click "Deploy" in the top bar
   - Choose deployment name: `blupi-staging`
   - Configure custom domain (optional): `staging.yourdomain.com`

2. **Update Firebase OAuth Settings**
   - Add staging domain to authorized domains
   - Update OAuth redirect URLs

## Step 9: Environment-Specific Features

### Staging-Only Features
- Add staging banner/watermark
- Enable debug logging
- Allow test data creation
- Relaxed rate limiting

### Production Safety
- Separate user bases
- Independent data storage
- No production data access

## Maintenance

### Keeping Staging Updated
1. Regularly sync code changes from production
2. Test new features in staging first
3. Run database migrations in staging before production
4. Monitor staging performance and errors

### Data Management
- Staging database can be reset safely
- Create test data scripts
- Document test scenarios

## Security Considerations

1. **Access Control**
   - Limit staging access to team members
   - Use different service account keys
   - Monitor staging usage

2. **Data Protection**
   - No production data in staging
   - Use synthetic test data
   - Regular staging data cleanup

## Troubleshooting

### Common Issues
1. **Authentication Errors**
   - Verify Firebase configuration
   - Check authorized domains
   - Validate service account keys

2. **Database Connection Issues**
   - Verify DATABASE_URL format
   - Check database permissions
   - Ensure database exists

3. **Environment Variable Issues**
   - Restart Replit after adding variables
   - Verify variable names match exactly
   - Check for extra spaces/characters

## Next Steps

After setup:
1. Create automated deployment pipeline
2. Set up monitoring and alerts
3. Configure automated testing
4. Document staging-specific procedures

---

This staging environment provides complete isolation from production while maintaining feature parity for safe testing and development.