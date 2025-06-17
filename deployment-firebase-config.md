# Correct Firebase Configuration for Deployment

These are the exact values that should be set in your deployment secrets:

## Deployment Secrets (must be synced)

**VITE_FIREBASE_API_KEY:**
```
[REDACTED - Set via deployment secrets/environment variables]
```

**VITE_FIREBASE_PROJECT_ID:**
```
blupi-458414
```

**VITE_FIREBASE_APP_ID:**
```
1:229356339230:web:1a57771b64980839faee0f
```

**VITE_FIREBASE_AUTH_DOMAIN:**
```
blupi-458414.firebaseapp.com
```

## Issue Identified

The deployment secrets are reverting to wrong values:
- PROJECT_ID shows "blueprints-48648" (WRONG) - should be "blupi-458414"
- APP_ID shows different value (WRONG) - should be "1:229356339230:web:1a57771b64980839faee0f"

## Steps to Fix

1. Delete ALL existing VITE_FIREBASE_* secrets in deployment
2. Re-add them with the exact correct values above
3. Ensure sync is enabled for each one
4. Redeploy

The wrong values suggest there might be old Firebase project configuration interfering.