#!/bin/bash

echo "🔍 Verifying Staging Environment Configuration"
echo "============================================="

# Check environment
echo "Environment: ${NODE_ENV:-development}"
echo "Custom Environment: ${ENVIRONMENT:-none}"

# Check database
if [ -n "$DATABASE_URL" ]; then
    echo "✅ Database URL configured"
else
    echo "❌ DATABASE_URL not set"
fi

# Check Firebase client config
if [ -n "$VITE_FIREBASE_PROJECT_ID" ]; then
    echo "✅ Firebase client config found"
    echo "   Project ID: $VITE_FIREBASE_PROJECT_ID"
else
    echo "❌ Firebase client config missing"
fi

# Check Firebase admin config
if [ -n "$FIREBASE_PROJECT_ID" ] && [ -n "$FIREBASE_CLIENT_EMAIL" ]; then
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
  sql`SELECT 1 as test`.then(() => {
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
