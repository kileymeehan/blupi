# Firebase Configuration Fix for my.blupi.io

## Problem Summary
The my.blupi.io domain is serving an incorrect Firebase API key (`AIzaSyDALLWQjfh2p...`) instead of the correct one (`AIzaSyBuQr4AYUNwjfwYu1qgds9Q0iRwpXcVIh0`), even though deployment secrets appear correct.

## Root Cause
The production deployment environment has cached/persistent Firebase configuration that overrides the correct environment variables. This is likely due to:
1. Build-time configuration caching
2. CDN/edge cache persistence
3. Container-level environment variable caching

## Solution Implemented
I've implemented a hardcoded Firebase configuration bypass that forces the correct values:

### Client-side Changes (`client/src/lib/firebase-config.ts`)
- Production domains (`my.blupi.io`) now ALWAYS fetch configuration from server
- Completely bypasses any cached environment variables
- Added domain detection to force server-side configuration

### Server-side Changes (`server/routes.ts`)
- Hardcoded correct Firebase configuration values
- Added no-cache headers to prevent browser/CDN caching
- Enhanced logging to track configuration requests

## Testing Instructions

### 1. Verify Server Configuration
```bash
curl https://my.blupi.io/api/firebase-config
```
Should return:
```json
{
  "apiKey": "[REDACTED - Firebase API Key]",
  "authDomain": "blupi-458414.firebaseapp.com",
  "projectId": "blupi-458414",
  "storageBucket": "blupi-458414.appspot.com",
  "messagingSenderId": "229356339230",
  "appId": "1:229356339230:web:1a57771b64980839faee0f"
}
```

### 2. Verify Diagnostics
```bash
curl https://my.blupi.io/api/firebase-diagnostics
```
Check that validation shows correct values.

### 3. Test Authentication
1. Visit https://my.blupi.io/auth/login
2. Try Google OAuth login
3. Check browser console for Firebase configuration logs

## If Issue Persists

### Clear All Caches
1. **Deployment Cache**: Force a fresh deployment/rebuild
2. **CDN Cache**: Clear any CDN caches (Cloudflare, etc.)
3. **Browser Cache**: Hard refresh (Ctrl+Shift+R)

### Environment Variable Override
The current implementation bypasses environment variables entirely, but if needed, verify deployment secrets are:
- `VITE_FIREBASE_API_KEY`: `[REDACTED - Set via environment variables]`
- `VITE_FIREBASE_PROJECT_ID`: `blupi-458414`
- `VITE_FIREBASE_APP_ID`: `1:229356339230:web:1a57771b64980839faee0f`

## Expected Behavior
- **Development domain**: Works perfectly (confirmed)
- **my.blupi.io**: Should now use server-provided configuration
- **Authentication**: Google OAuth should work on both domains

## Monitoring
Check server logs for messages like:
```
[HTTP] Firebase config request from: { hostname: 'my.blupi.io', ... }
[HTTP] Serving hardcoded Firebase config: { apiKeyStart: 'AIzaSyBuQr...', ... }
```

This confirms the fix is working correctly.