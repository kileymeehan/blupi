# Firebase Staging Project Setup

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
