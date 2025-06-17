# Database Staging Setup

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
```bash
# Set environment variables in Replit Secrets
# Then run:
npm run db:push
```

This will create all tables in your staging database.
