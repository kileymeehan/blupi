# Replit Staging Configuration

## Project Setup
1. Fork your current Blupi project
2. Rename to "blupi-staging"
3. Add environment variables from STAGING_ENV_VARIABLES.txt

## Environment Variables to Add in Replit Secrets:
- NODE_ENV=staging
- ENVIRONMENT=staging
- DATABASE_URL=your_staging_database_url
- VITE_FIREBASE_API_KEY=your_staging_api_key
- VITE_FIREBASE_AUTH_DOMAIN=blupi-staging.firebaseapp.com
- VITE_FIREBASE_PROJECT_ID=blupi-staging
- VITE_FIREBASE_APP_ID=your_staging_app_id
- FIREBASE_PROJECT_ID=blupi-staging
- FIREBASE_CLIENT_EMAIL=your_staging_service_account_email
- FIREBASE_PRIVATE_KEY=your_staging_private_key
- VITE_GOOGLE_AI_API_KEY=your_google_ai_key
- STAGING_BANNER_ENABLED=true
- DEBUG_MODE=true