#!/usr/bin/env node

/**
 * Blupi Staging Project Creation Script
 * 
 * This script helps automate the creation of a staging environment
 * by generating the necessary configuration files and documentation.
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Creating Blupi Staging Environment Configuration');
console.log('==================================================');

// Environment variables template for staging
const stagingEnvTemplate = `# Blupi Staging Environment Variables
# Add these to your staging Replit project's Secrets

# Environment Configuration
NODE_ENV=staging
ENVIRONMENT=staging

# Database Configuration (Create new staging database)
DATABASE_URL=postgresql://username:password@host:port/blupi_staging?sslmode=require

# Firebase Configuration (Create new staging project)
VITE_FIREBASE_API_KEY=your_staging_api_key
VITE_FIREBASE_AUTH_DOMAIN=blupi-staging.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=blupi-staging
VITE_FIREBASE_APP_ID=your_staging_app_id

# Firebase Admin SDK (Download from staging project)
FIREBASE_PROJECT_ID=blupi-staging
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@blupi-staging.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nyour_staging_private_key\\n-----END PRIVATE KEY-----\\n"

# Optional API Keys (can reuse from production)
VITE_GOOGLE_AI_API_KEY=your_google_ai_api_key

# Staging-specific features
STAGING_BANNER_ENABLED=true
DEBUG_MODE=true
RATE_LIMIT_ENABLED=false
`;

// Create staging environment file
fs.writeFileSync('STAGING_ENV_VARIABLES.txt', stagingEnvTemplate);
console.log('✅ Created STAGING_ENV_VARIABLES.txt');

// Create Firebase setup guide
const firebaseSetupGuide = `# Firebase Staging Project Setup

## Step 1: Create New Firebase Project
1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Project name: "blupi-staging"
4. Enable Google Analytics (optional)

## Step 2: Configure Authentication
1. Authentication → Sign-in method
2. Enable:
   - Google (configure OAuth)
   - Email/Password
   - Email link (passwordless)

## Step 3: Add Web App
1. Project Settings → General
2. "Add app" → Web
3. App nickname: "blupi-staging-web"
4. Copy configuration values

## Step 4: Create Service Account
1. Project Settings → Service accounts
2. "Generate new private key"
3. Download JSON file
4. Extract values for environment variables

## Step 5: Configure Authorized Domains
Add your staging domain to authorized domains:
- your-staging-repl.replit.app
- Any custom domains you plan to use

## OAuth Configuration
Update OAuth consent screen and redirect URIs to include staging domains.
`;

fs.writeFileSync('FIREBASE_STAGING_SETUP.md', firebaseSetupGuide);
console.log('✅ Created FIREBASE_STAGING_SETUP.md');

// Create database setup guide
const databaseSetupGuide = `# Database Staging Setup

## Option 1: New Neon Project (Recommended)
1. Go to https://console.neon.tech/
2. Create new project: "blupi-staging"
3. Copy connection string
4. Add to STAGING_ENV_VARIABLES.txt

## Option 2: New Database in Existing Project
1. In your existing Neon project
2. Create new database: "blupi_staging"
3. Update connection string to use new database name

## Running Migrations
After setting up the database:
\`\`\`bash
# Set environment variables in Replit Secrets
# Then run:
npm run db:push
\`\`\`

This will create all tables in your staging database.
`;

fs.writeFileSync('DATABASE_STAGING_SETUP.md', databaseSetupGuide);
console.log('✅ Created DATABASE_STAGING_SETUP.md');

// Create replit configuration template
const replitConfig = `# Replit Staging Configuration

## Project Setup
1. Fork your current Blupi project
2. Rename to "blupi-staging"
3. Add environment variables from STAGING_ENV_VARIABLES.txt

## Environment Variables to Add in Replit Secrets:
`;

const envVars = [
  'NODE_ENV=staging',
  'ENVIRONMENT=staging',
  'DATABASE_URL=your_staging_database_url',
  'VITE_FIREBASE_API_KEY=your_staging_api_key',
  'VITE_FIREBASE_AUTH_DOMAIN=blupi-staging.firebaseapp.com',
  'VITE_FIREBASE_PROJECT_ID=blupi-staging',
  'VITE_FIREBASE_APP_ID=your_staging_app_id',
  'FIREBASE_PROJECT_ID=blupi-staging',
  'FIREBASE_CLIENT_EMAIL=your_staging_service_account_email',
  'FIREBASE_PRIVATE_KEY=your_staging_private_key',
  'VITE_GOOGLE_AI_API_KEY=your_google_ai_key',
  'STAGING_BANNER_ENABLED=true',
  'DEBUG_MODE=true'
];

const replitConfigContent = replitConfig + envVars.map(v => `- ${v}`).join('\n');

fs.writeFileSync('REPLIT_STAGING_CONFIG.md', replitConfigContent);
console.log('✅ Created REPLIT_STAGING_CONFIG.md');

// Create verification script
const verificationScript = `#!/bin/bash

echo "🔍 Verifying Staging Environment Configuration"
echo "============================================="

# Check environment
echo "Environment: \${NODE_ENV:-development}"
echo "Custom Environment: \${ENVIRONMENT:-none}"

# Check database
if [ -n "\$DATABASE_URL" ]; then
    echo "✅ Database URL configured"
else
    echo "❌ DATABASE_URL not set"
fi

# Check Firebase client config
if [ -n "\$VITE_FIREBASE_PROJECT_ID" ]; then
    echo "✅ Firebase client config found"
    echo "   Project ID: \$VITE_FIREBASE_PROJECT_ID"
else
    echo "❌ Firebase client config missing"
fi

# Check Firebase admin config
if [ -n "\$FIREBASE_PROJECT_ID" ] && [ -n "\$FIREBASE_CLIENT_EMAIL" ]; then
    echo "✅ Firebase admin config found"
else
    echo "❌ Firebase admin config missing"
fi

# Test database connection
echo ""
echo "Testing database connection..."
node -e "
const { neon } = require('@neondatabase/serverless');
if (process.env.DATABASE_URL) {
  const sql = neon(process.env.DATABASE_URL);
  sql\`SELECT 1 as test\`.then(() => {
    console.log('✅ Database connection successful');
  }).catch(err => {
    console.log('❌ Database connection failed:', err.message);
  });
} else {
  console.log('❌ No DATABASE_URL provided');
}
"

echo ""
echo "Verification complete!"
`;

fs.writeFileSync('scripts/verify-staging.sh', verificationScript);
fs.chmodSync('scripts/verify-staging.sh', '755');
console.log('✅ Created scripts/verify-staging.sh');

console.log('\n🎉 Staging environment configuration created!');
console.log('\nNext steps:');
console.log('1. Fork your Replit project and rename to "blupi-staging"');
console.log('2. Follow FIREBASE_STAGING_SETUP.md to create staging Firebase project');
console.log('3. Follow DATABASE_STAGING_SETUP.md to create staging database');
console.log('4. Add environment variables from STAGING_ENV_VARIABLES.txt to Replit Secrets');
console.log('5. Run ./scripts/verify-staging.sh to verify configuration');
console.log('6. Deploy your staging environment');

console.log('\n📁 Files created:');
console.log('- STAGING_ENV_VARIABLES.txt');
console.log('- FIREBASE_STAGING_SETUP.md');
console.log('- DATABASE_STAGING_SETUP.md');
console.log('- REPLIT_STAGING_CONFIG.md');
console.log('- scripts/verify-staging.sh');