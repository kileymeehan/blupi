# Blupi - Collaborative Design Platform

## Overview
Blupi is an advanced collaborative product design platform that leverages AI and real-time technologies to transform team creativity and design workflows. The platform provides sophisticated visual collaboration tools with intelligent design management and enhanced team interactions.

**Current State**: Production-ready application with comprehensive staging deployment configuration

## Project Architecture

### Core Technologies
- **Frontend**: React with TypeScript, Wouter routing
- **Backend**: Express.js with WebSocket support
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Firebase Auth with OAuth integration
- **AI Integration**: Stable Diffusion XL via Replicate API for storyboard generation
- **Real-time**: WebSocket-powered collaborative editing
- **Deployment**: Replit with custom domain support

### Key Features
- Real-time collaborative design boards
- AI-powered storyboard generation using DALL-E 3 and Stable Diffusion XL
- Comprehensive starring system for tracking design opportunities
- Multi-user authentication with Google OAuth
- Project and team management
- Sheet document integration
- Notification system
- Rate limiting and security measures

## Recent Changes (December 2024)

### Multi-Tenant Architecture Implementation (December 19, 2024)
- **Organizations table created** with UUID primary keys for tenant isolation
- **user_organizations junction table** for user membership with active organization tracking
- **organizationId columns added** to projects, boards, and related tables
- **Tenant extraction middleware** (`server/tenant-middleware.ts`) reads active organization from session
- **Core storage methods updated** with tenant filtering:
  - `getProjects`, `getProjectsByMember`, `getProject` - filter by organizationId
  - `getBoards`, `getBoardsForUser`, `getBoardsByProject`, `getBoard` - filter by organizationId
  - `createProject`, `createBoard` - include organizationId on creation
- **API routes enforced with requireTenant middleware**:
  - All project CRUD routes (`/api/projects`, `/api/projects/:id`)
  - All board CRUD routes (`/api/boards`, `/api/boards/:id`)
  - Project boards route (`/api/projects/:id/boards`)
- **Resource-level tenant validation** - getProject and getBoard verify organization matches request tenant
- **Data migration completed** - 84 projects, 65 boards, 20 users backfilled to default organization

**Security Model**: Routes protected by requireTenant return 403 if user has no active organization. Storage methods filter by organizationId when provided, ensuring users only see data from their active organization.

**Remaining Work** (lower priority):
- Make organizationId column non-nullable in schema (requires data validation)
- Enable RLS policies at database level for defense-in-depth

### Database & Session Stability Improvements (December 18, 2024)
- **PostgreSQL-backed session storage** using connect-pg-simple for persistence across restarts
- **Neon serverless driver upgraded** to Pool-based connection with WebSocket support for transactions
- **Row-Level Security (RLS) infrastructure** added with comprehensive policy migration script
- **RLS utility module** (`server/rls.ts`) with `withRLS()` transaction wrapper for data isolation
- **Feature flag system** (`server/feature-flags.ts`) for graceful handling of disabled features
- **Enhanced health endpoint** now includes feature flags status and enabled/disabled features
- **Transaction support verified** for future RLS policy enforcement

### RLS Policy System
The application now includes a comprehensive RLS migration in `server/migrations/rls-policies.sql` covering:
- Projects (owner access + project member access)
- Boards (owner, permission-based, and project-based access)
- Notifications (user-specific only)
- Team members and invitations (organization-scoped)
- Flagged blocks (user-specific)

Usage pattern:
```typescript
import { withRLS } from './rls';
await withRLS(userId, async (tx) => {
  // All queries automatically filtered by RLS policies
});
```

### Feature Flags
Features are automatically enabled/disabled based on API key availability:
- `aiStoryboardGeneration`: Requires OPENAI_API_KEY or REPLICATE_API_TOKEN
- `aiCsvClassification`: Requires OPENAI_API_KEY
- `emailNotifications`: Requires SENDGRID_API_KEY
- `pendoIntegration`: Requires PENDO_API_KEY
- `googleSheetsIntegration`: Requires GOOGLE_SERVICE_ACCOUNT_KEY

Check `/api/health` endpoint for current feature status.

### AI Image Generation Fixed (June 25, 2025)
- **Resolved storyboard generation issue** affecting both development and production
- **Fixed `__dirname` compatibility errors** in ES module production environment
- **Replaced express.static middleware** with dedicated API route for image serving
- **Eliminated 500 errors** when serving AI-generated storyboard images
- **Simplified artistic style** to clean black and white line drawings without panel framing
- **Improved prompt accuracy** by prioritizing scene description over artistic style directives
- **Switched from Stable Diffusion XL to DALL-E 3** for significantly better prompt adherence and scene accuracy
- **Updated prompt style to cartoon/stick figure format** to create generic, non-specific character representations
- **Enhanced prompts to show environment/context** rather than person close-ups, with optional multi-panel storytelling
- **Fixed production authentication issue** by using consistent session handling across environments
- **Updated CSP headers** to allow OpenAI DALL-E image URLs for proper image serving
- **Production storyboard generation now fully functional** on my.blupi.io

### Staging Environment Setup (June 23, 2025)
- **Comprehensive staging deployment configuration** implemented
- **Environment-aware configuration system** with staging/production separation
- **Visual staging indicators** including orange banner and environment badges
- **Automated setup scripts** for staging environment configuration
- **DNS configuration guides** for Squarespace domain management
- **Complete isolation** between staging and production environments

### Production CSP Fix (June 2025)
- **Resolved CSP issue** blocking AI-generated images on production
- **Fixed malformed Replit domain wildcards** in img-src directive
- **Implemented comprehensive diagnostic logging** for image generation pipeline
- **Added CSP violation reporting** for ongoing monitoring
- **Production images now loading successfully** on my.blupi.io

### AI Image Generation System
- **Replicate API integration** for Stable Diffusion XL
- **Comprehensive error handling** and retry mechanisms  
- **Image serving and management** with proper file permissions
- **Storyboard generation workflow** with user-friendly interface

## User Preferences
- **Communication Style**: Professional and direct, avoid repetitive phrases
- **Technical Detail**: Provide comprehensive technical information
- **Documentation**: Maintain detailed architectural documentation
- **Deployment**: Prefer Replit for hosting and deployment
- **Testing**: Implement staging environment for safe testing before production

## Project Structure

### Client (`client/`)
- React application with TypeScript
- Component-based architecture using shadcn/ui
- Real-time collaboration features
- AI-powered design tools

### Server (`server/`)
- Express.js API with WebSocket support
- Authentication and session management
- Database operations via Drizzle ORM
- AI service integrations

### Shared (`shared/`)
- Database schema definitions
- Type definitions and interfaces
- Shared utilities and constants

### Configuration (`config/`)
- Environment-aware configuration system
- Staging and production environment separation
- Feature flags and environment-specific settings

## Deployment Configuration

### Production Environment
- **Domain**: my.blupi.io
- **Branch**: production
- **Database**: Production PostgreSQL instance
- **Firebase**: Production Firebase project
- **Features**: Full production configuration with rate limiting

### Staging Environment  
- **Domain**: staging.blupi.io
- **Branch**: main (auto-deploys from main branch)
- **Database**: Separate staging PostgreSQL instance
- **Firebase**: Separate staging Firebase project
- **Features**: Debug mode enabled, staging banner, relaxed rate limiting

### DNS Configuration
- **Production**: my.blupi.io → production deployment
- **Staging**: staging.blupi.io → staging deployment via CNAME to [username].repl.co

## Security and Performance
- **CSP Headers**: Properly configured for production image serving
- **Rate Limiting**: Environment-aware rate limiting configuration
- **Authentication**: Secure Firebase authentication with OAuth
- **Error Monitoring**: Comprehensive logging and error tracking
- **Session Management**: Secure session handling with PostgreSQL store

## Development Workflow
1. **Local Development**: Test features locally
2. **Main Branch**: Push to main for automatic staging deployment
3. **Staging Testing**: Verify functionality on staging.blupi.io
4. **Production Release**: Merge main → production for production deployment

This architecture ensures safe testing and deployment cycles while maintaining production stability.