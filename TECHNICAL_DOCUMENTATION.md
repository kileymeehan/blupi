# Blupi Platform - Technical Documentation

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [Authentication & Security](#authentication--security)
6. [AI & External Integrations](#ai--external-integrations)
7. [Real-Time Features](#real-time-features)
8. [Environment Configuration](#environment-configuration)
9. [Development Setup](#development-setup)
10. [API Reference](#api-reference)
11. [Deployment](#deployment)
12. [Troubleshooting](#troubleshooting)

---

## Overview

Blupi is an advanced collaborative product design platform that leverages AI and real-time technologies to transform team creativity and design workflows.

### Key Features
- **Real-time Collaboration**: WebSocket-powered multi-user board editing with live presence indicators
- **AI-Powered Storyboards**: DALL-E 3 integration for generating contextual storyboard images
- **Flexible Authentication**: Firebase Auth with Google OAuth + local email/password
- **Project Management**: Projects, boards, team permissions, and member invitations
- **Google Sheets Integration**: Live data connections for metrics blocks
- **Google Slides Export**: Export boards to Google Slides presentations
- **PDF Workflow Import**: AI-powered extraction of workflow steps from PDF documents
- **Notifications System**: Real-time notifications for team activities
- **Flagged Blocks**: Track and manage important design opportunities

---

## Technology Stack

### Frontend
- **React**: 18.3.1 with TypeScript 5.6.3
- **Routing**: Wouter 3.3.5 (client-side routing)
- **State Management**: TanStack Query 5.60.5 (server state & caching)
- **UI Library**: Radix UI + shadcn/ui components
- **Styling**: Tailwind CSS 3.4.14 + tailwindcss-animate
- **Forms**: React Hook Form 7.53.1 + Zod 3.23.8 validation
- **Drag & Drop**: @hello-pangea/dnd 18.0.1
- **Animations**: Framer Motion 11.13.1
- **Charts**: Recharts 2.13.0
- **Icons**: Lucide React 0.453.0 + React Icons 5.4.0

### Backend
- **Runtime**: Node.js with TypeScript (ES Modules)
- **Framework**: Express.js 4.21.2
- **WebSocket**: ws 8.18.0 (embedded in HTTP server)
- **ORM**: Drizzle ORM 0.39.1
- **Database**: PostgreSQL (@neondatabase/serverless 0.10.4)
- **Session Store**: memorystore 1.6.7
- **Authentication**: Passport.js 0.7.0 + Firebase Admin 13.4.0

### AI & External Services
- **Image Generation**: OpenAI SDK 4.104.0 (DALL-E 3)
- **Backup AI**: Replicate 1.0.1 (Stable Diffusion XL)
- **Google APIs**: googleapis 148.0.0 (Sheets, Slides, Docs)
- **Email**: SendGrid @sendgrid/mail 8.1.5
- **PDF Processing**: pdf-lib 1.17.1 + pdf2pic 3.2.0

### Security & Performance
- **Helmet**: 8.1.0 (security headers)
- **Rate Limiting**: express-rate-limit 7.5.1
- **CSP**: Content Security Policy configured
- **HSTS**: Strict-Transport-Security headers

### Build Tools
- **Bundler**: Vite 5.4.15
- **Compiler**: esbuild 0.25.0
- **Dev Execution**: tsx 4.19.1
- **Migrations**: Drizzle Kit 0.30.4

---

## Project Structure

```
blupi/
├── client/                     # Frontend React app
│   ├── public/
│   │   └── images/            # Static assets (AI-generated storyboard images)
│   └── src/
│       ├── components/        # React components
│       │   ├── ui/           # shadcn/ui component library
│       │   └── google-sheets/ # Google Sheets integration UI
│       ├── pages/            # Page-level components (Wouter routes)
│       ├── lib/              # Utilities, Firebase config, query client
│       ├── services/         # Frontend service layer
│       └── hooks/            # Custom React hooks
│
├── server/                     # Backend Express app
│   ├── routes/                # Modular route handlers
│   ├── services/              # Business logic services
│   ├── utils/                 # Utility modules
│   │   ├── openai.ts         # OpenAI DALL-E 3 service
│   │   ├── replicate.ts      # Replicate API service
│   │   ├── google-sheets-fixed.ts # Google Sheets API
│   │   ├── google-slides.ts  # Google Slides export
│   │   ├── pendo.ts          # Pendo API integration
│   │   ├── ai-classifier.ts  # AI-powered CSV classification
│   │   └── pdf-workflow-parser.ts # PDF text extraction + AI parsing
│   ├── index.ts              # Server entry (middleware setup)
│   ├── routes.ts             # API route definitions + WebSocket server
│   ├── storage.ts            # Database abstraction layer (IStorage interface)
│   ├── auth.ts               # Passport Local Strategy setup
│   ├── firebase-admin.ts     # Firebase Admin SDK initialization
│   ├── firebase-config.ts    # Firebase client config endpoint
│   ├── google-oauth-config.ts # Google OAuth setup
│   ├── rate-limiter.ts       # Rate limiting configurations
│   ├── monitoring.ts         # Health checks and error monitoring
│   ├── email-service.ts      # SendGrid email service
│   ├── notification-service.ts # Notification creation service
│   └── vite.ts               # Vite dev server integration
│
├── shared/                     # Shared types and schemas
│   └── schema.ts             # Drizzle database schema + Zod validators
│
├── config/                     # Environment configuration
│   └── environment.ts        # Dev/Staging/Production configs
│
└── public/                     # Production build output
```

---

## Database Schema

### Core Tables

#### users
Primary user accounts with both local and Firebase authentication support.

```typescript
{
  id: serial (primary key)
  email: text (unique, not null)
  username: text (unique, not null)
  password: text (not null) // Hashed with scrypt
  firstName: text (nullable)
  lastName: text (nullable)
  profileImageUrl: text (nullable)
  firebaseUid: text (unique, nullable) // Links to Firebase Auth
  createdAt: timestamp (default now)
}
```

#### projects
Top-level containers for organizing boards.

```typescript
{
  id: serial (primary key)
  name: text (not null)
  description: text (nullable)
  color: text (hex color, default '#4F46E5')
  status: text (draft|in-progress|review|complete)
  userId: integer (FK -> users.id, not null)
  createdAt: timestamp (default now)
  updatedAt: timestamp (default now)
}
```

#### boards
Collaborative design boards with phases, columns, and blocks.

```typescript
{
  id: serial (primary key)
  name: text (not null)
  description: text (nullable)
  segments: text (nullable)
  blocks: jsonb (Block[], default []) // Main board content
  phases: jsonb (Phase[], default []) // Column organization
  status: text (draft|in-progress|review|complete)
  projectId: integer (FK -> projects.id, nullable)
  userId: integer (FK -> users.id, not null)
  createdAt: timestamp (default now)
  updatedAt: timestamp (default now)
}
```

**Block Structure** (JSONB):
```typescript
{
  id: string (nanoid)
  type: 'touchpoint' | 'email' | 'pendo' | 'role' | 'process' | 
        'friction' | 'policy' | 'technology' | 'rationale' | 
        'question' | 'note' | 'hidden' | 'hypothesis' | 'insight' | 
        'metrics' | 'experiment' | 'video' | 'front-stage' | 
        'back-stage' | 'custom-divider'
  content: string
  phaseIndex: number
  columnIndex: number
  comments?: LegacyComment[]
  attachments?: Attachment[]
  notes?: string
  emoji?: string
  department?: Department
  customDepartment?: string
  isDivider?: boolean
  sheetsConnection?: SheetsConnection
  experimentTarget?: string
  flagged?: boolean
}
```

**Phase Structure** (JSONB):
```typescript
{
  id: string (nanoid)
  name: string
  columns: Column[]
  collapsed?: boolean
  importedFromBoardId?: number
}
```

**Column Structure**:
```typescript
{
  id: string (nanoid)
  name: string
  image?: string
  storyboardPrompt?: string
  storyboardImageUrl?: string // DALL-E 3 generated image URL
  emotion?: {
    value: 1-7  // Emotional intensity scale
    color: string // Hex color
  }
}
```

### Permission Tables

#### boardPermissions
```typescript
{
  id: serial (primary key)
  boardId: integer (FK -> boards.id, not null)
  userId: integer (FK -> users.id, not null)
  role: text (owner|editor|viewer, default 'viewer')
  grantedBy: integer (FK -> users.id, not null)
  grantedAt: timestamp (default now)
  lastAccessAt: timestamp (nullable)
}
```

#### projectMembers
```typescript
{
  id: serial (primary key)
  projectId: integer (FK -> projects.id, not null)
  userId: integer (FK -> users.id, not null)
  role: text (admin|member, not null)
  status: text (pending|active, default 'pending')
  invitedAt: timestamp (default now)
  acceptedAt: timestamp (nullable)
}
```

#### teamMembers
```typescript
{
  id: serial (primary key)
  organizationId: integer (not null)
  userId: integer (FK -> users.id, not null)
  invitedBy: integer (FK -> users.id, not null)
  email: text (not null)
  role: text (admin|member, default 'member')
  status: text (pending|active|inactive, default 'pending')
  invitedAt: timestamp (default now)
  acceptedAt: timestamp (nullable)
  lastAccessAt: timestamp (nullable)
}
```

### Communication Tables

#### notifications
```typescript
{
  id: text (primary key, nanoid)
  toUserId: integer (FK -> users.id, not null)
  type: text (team_invitation|comment_mention|board_shared|
              project_shared|role_change, not null)
  title: text (not null)
  message: text (not null)
  meta: jsonb (nullable) // Type-specific metadata
  read: boolean (default false)
  createdAt: timestamp (default now)
  readAt: timestamp (nullable)
}
```

#### boardComments
```typescript
{
  id: serial (primary key)
  boardId: integer (FK -> boards.id, not null)
  blockId: text (nullable) // Optional block reference
  userId: integer (FK -> users.id, not null)
  content: text (not null)
  mentions: jsonb (number[], nullable) // User IDs
  parentId: integer (FK -> boardComments.id, nullable) // Threading
  resolved: boolean (default false)
  createdAt: timestamp (default now)
  updatedAt: timestamp (default now)
}
```

#### pendingInvitations
```typescript
{
  id: serial (primary key)
  token: text (unique, not null, nanoid)
  email: text (not null)
  organizationId: integer (not null)
  invitedBy: integer (FK -> users.id, not null)
  role: text (default 'member')
  teamName: text (not null)
  inviterName: text (not null)
  createdAt: timestamp (default now)
  expiresAt: timestamp (not null)
  acceptedAt: timestamp (nullable)
  status: text (pending|accepted|expired, default 'pending')
}
```

### Google Sheets Tables

#### sheetDocuments (Board-level)
```typescript
{
  id: text (primary key, nanoid)
  boardId: integer (FK -> boards.id, not null)
  name: text (not null)
  sheetId: text (not null) // Google Sheets document ID
  createdAt: timestamp (default now)
  updatedAt: timestamp (default now)
}
```

#### projectSheetDocuments (Project-level)
```typescript
{
  id: text (primary key, nanoid)
  projectId: integer (FK -> projects.id, not null)
  name: text (not null)
  sheetId: text (not null)
  url: text (not null)
  createdAt: timestamp (default now)
  updatedAt: timestamp (default now)
}
```

### Tracking Tables

#### flaggedBlocks
```typescript
{
  id: serial (primary key)
  boardId: integer (FK -> boards.id, not null)
  blockId: text (not null)
  userId: integer (FK -> users.id, not null)
  reason: text (nullable)
  createdAt: timestamp (default now)
  resolvedAt: timestamp (nullable)
  resolved: boolean (default false)
}
```

---

## Authentication & Security

### Dual Authentication System

Blupi supports **two authentication methods**:

1. **Local Email/Password** (Passport.js + scrypt hashing)
2. **Firebase Auth with Google OAuth**

#### Local Authentication Flow

1. User submits email + password to `/api/register` or `/api/login`
2. Server validates with Passport Local Strategy
3. Password hashed with `scrypt` (salt + 64-byte hash)
4. Session created with express-session (memorystore)
5. Session cookie sent to client (HTTP-only, Secure, SameSite=Lax)

**Code Location**: `server/auth.ts`

#### Firebase Authentication Flow

1. Client initiates Google OAuth through Firebase SDK
2. Firebase returns ID token to client
3. Client sends ID token to `/api/auth/google/exchange`
4. Server verifies token with Firebase Admin SDK
5. Server creates/updates user with `firebaseUid` field
6. Session created with user ID
7. Client receives authenticated session

**Code Locations**:
- Client: `client/src/lib/firebase-config.ts`
- Server: `server/firebase-admin.ts`, `server/firebase-config.ts`

### Session Management

- **Store**: memorystore (in-memory session storage)
- **Cookie**: `connect.sid`, HTTP-only, Secure (production), SameSite=Lax
- **Session Data**: `req.session.userId` or `req.session.firebaseUid`
- **Lifetime**: Configurable (default 30 days)

**Code Location**: `server/index.ts` (session middleware setup)

### Security Features

#### 1. Helmet Security Headers
```javascript
- Content Security Policy (CSP)
- HSTS (HTTP Strict Transport Security, 2-year max-age)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Cross-Origin policies
```

#### 2. Content Security Policy
```javascript
defaultSrc: ["'self'"]
scriptSrc: [
  "'self'", "'unsafe-inline'", "'unsafe-eval'",
  "https://apis.google.com",
  "https://*.firebaseio.com",
  "https://accounts.google.com"
]
connectSrc: [
  "'self'", "wss:",
  "https://*.googleapis.com",
  "https://*.firebaseio.com"
]
imgSrc: [
  "'self'", "data:", "blob:", "https:",
  "https://*.replit.app",
  "https://*.replit.dev",
  "https://oaidalleapiprodscus.blob.core.windows.net" // DALL-E 3
]
```

#### 3. Rate Limiting

**General Endpoints** (`generalRateLimit`):
- Window: 15 minutes
- Limit: 1000 requests per IP

**AI Endpoints** (`aiRateLimit`):
- Window: 1 hour
- Limit: 20 requests per IP

**Board Updates** (`boardUpdateRateLimit`):
- Window: 1 minute
- Limit: 100 requests per IP

**Google Sheets** (`sheetsRateLimit`):
- Window: 1 minute
- Limit: 60 requests per IP

**Code Location**: `server/rate-limiter.ts`

#### 4. Password Hashing
```typescript
Algorithm: scrypt
Salt: 16 bytes (random)
Derived key: 64 bytes
Format: {hash}.{salt} (hex-encoded)
```

---

## AI & External Integrations

### OpenAI DALL-E 3 (Primary Image Generation)

**Service Class**: `OpenAIService` in `server/utils/openai.ts`

**Configuration**:
```typescript
Model: "dall-e-3"
Size: "1024x1024"
Quality: "standard"
N: 1 image per request
```

**Prompt Engineering**:
```
Base Prompt: "{user_input}"

Styled Prompt: "{user_input}. Show the full scene with environment 
and context, not just close-up of person. Simple cartoon style, 
black and white line drawing, generic non-specific people 
(stick figures or basic shapes), show setting/location clearly. 
Use 1-3 panels if helpful to tell the story. Minimal clean style."
```

**API Endpoint**: `POST /api/boards/:boardId/columns/:columnId/generate-storyboard`

**Response**:
- Image URL from Azure Blob Storage (temporary, ~24 hours)
- URL stored in column's `storyboardImageUrl` field
- CSP allows loading from `oaidalleapiprodscus.blob.core.windows.net`

### Replicate (Backup AI Service)

**Service Class**: `replicateService` in `server/utils/replicate.ts`

**Model**: stability-ai/sdxl

**Purpose**: Fallback option for image generation if needed

### Google Services

#### Google Sheets API

**Utilities**: `server/utils/google-sheets-fixed.ts`

**Features**:
- Extract sheet ID from URLs
- Fetch cell data
- Fetch sheet names (tabs)
- Convert sheet data to CSV

**Key Endpoints**:
- `POST /api/google-sheets/validate` - Validate sheet URL
- `POST /api/google-sheets/data` - Fetch sheet data
- `POST /api/google-sheets/cell` - Fetch specific cell value

#### Google Slides API

**Service Class**: `GoogleSlidesService` in `server/utils/google-slides.ts`

**Endpoint**: `POST /api/export-to-slides`

**Functionality**: Creates Google Slides presentation from board data

#### Google Docs API

**Endpoint**: `POST /api/export/google-docs`

**Functionality**: Exports board content to Google Docs

### Pendo Integration

**Utilities**: `server/utils/pendo.ts`

**Features**:
- OAuth authorization flow
- Fetch friction metrics
- Integration status checking

**Endpoints**:
- `GET /api/pendo/status`
- `GET /api/pendo/authorize`
- `GET /api/pendo/callback`
- `GET /api/pendo/friction/:id`

### PDF Workflow Parsing

**Service**: `server/utils/pdf-workflow-parser.ts`

**Features**:
- Extract text from PDF using pdf-lib
- Use OpenAI to parse workflow steps
- Convert steps to Blupi blocks

**Endpoint**: `POST /api/boards/:boardId/import-pdf-workflow`

**Process**:
1. Upload PDF file (10MB max)
2. Extract text from PDF
3. Send text to OpenAI for workflow step extraction
4. Convert AI response to board blocks
5. Add blocks to board
6. Broadcast update via WebSocket

### SendGrid Email Service

**Service**: `server/email-service.ts`

**Purpose**: Send team invitation emails

**Template**: HTML email with invitation link and team details

---

## Real-Time Features

### WebSocket Server

**Implementation**: Embedded in `server/routes.ts` (lines 353-483)

**Configuration**:
```typescript
Path: '/ws'
Server: HTTP server (shared with Express)
Client Tracking: Enabled
Per-Message Deflate: Disabled
Max Payload: 16MB
```

**Connection Management**:
- Each connection assigned unique ID (nanoid)
- Users tracked in `connectedUsers` Map
- Heartbeat ping every 30 seconds
- Auto-cleanup on disconnect

**Message Types**:

#### subscribe (Client → Server)
```json
{
  "type": "subscribe",
  "boardId": "123",
  "userName": "John Doe",
  "userEmoji": "👤",
  "userPhotoURL": "https://..."
}
```

#### users_update (Server → Client)
```json
{
  "type": "users_update",
  "users": [
    {
      "id": "abc123",
      "name": "John Doe",
      "color": "#FF5733",
      "emoji": "👤",
      "photoURL": "https://..."
    }
  ]
}
```

#### board_update (Server → All Board Users)
```json
{
  "type": "board_update",
  "board": { ...board_data }
}
```

**Use Cases**:
- Real-time user presence indicators
- Live board updates when users make changes
- Collaborative editing synchronization
- PDF import broadcast

---

## Environment Configuration

### Environment File: `config/environment.ts`

Blupi supports three environments: **development**, **staging**, and **production**.

#### Environment Detection

Priority order:
1. `process.env.ENVIRONMENT`
2. `process.env.NODE_ENV`
3. Default: `'development'`

#### Configuration Structure

```typescript
interface EnvironmentConfig {
  name: string
  isDevelopment: boolean
  isStaging: boolean
  isProduction: boolean
  database: { url: string }
  firebase: { apiKey, authDomain, projectId, appId }
  features: {
    debugMode: boolean
    stagingBanner: boolean
    rateLimitEnabled: boolean
    errorReporting: boolean
  }
  ui: {
    showEnvironmentBadge: boolean
    allowTestData: boolean
  }
}
```

#### Environment-Specific Settings

**Development**:
- Debug mode: ON
- Rate limiting: OFF
- Staging banner: OFF
- Environment badge: ON
- Test data: Allowed

**Staging**:
- Debug mode: Configurable (`DEBUG_MODE` env var)
- Rate limiting: Configurable (`RATE_LIMIT_ENABLED` env var)
- Staging banner: ON (configurable via `STAGING_BANNER_ENABLED`)
- Environment badge: ON
- Test data: Allowed

**Production**:
- Debug mode: OFF
- Rate limiting: ON
- Staging banner: OFF
- Environment badge: OFF
- Test data: NOT allowed

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Firebase (Client - prefixed with VITE_)
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=blupi-458414.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=blupi-458414
VITE_FIREBASE_STORAGE_BUCKET=blupi-458414.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=229356339230
VITE_FIREBASE_APP_ID=1:229356339230:web:...

# Firebase (Server)
FIREBASE_API_KEY=AIza... # Can differ from VITE_ version
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# Google OAuth
GOOGLE_CLIENT_ID=229356339230-....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...

# Google APIs
GOOGLE_API_KEY=AIza...

# AI Services
OPENAI_API_KEY=sk-...
REPLICATE_API_TOKEN=r8_... (optional)

# Email
SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=noreply@blupi.io

# Session
SESSION_SECRET=<random_64_char_string>

# Optional
PENDO_CLIENT_ID=...
PENDO_CLIENT_SECRET=...
PENDO_REDIRECT_URI=http://localhost:5000/api/pendo/callback
```

---

## Development Setup

### Prerequisites
- Node.js 18+ recommended
- PostgreSQL database (Replit provides this automatically)
- npm or yarn

### Installation Steps

1. **Clone Repository**
```bash
git clone <repository-url>
cd blupi
```

2. **Install Dependencies**
```bash
npm install
```

3. **Configure Environment**
Create `.env` file or configure Replit Secrets with required variables (see Environment Configuration section).

4. **Initialize Database**
```bash
npm run db:push
```

If you encounter data-loss warnings:
```bash
npm run db:push --force
```

5. **Start Development Server**
```bash
npm run dev
```

Application runs on `http://localhost:5000`

### Development Commands

```bash
# Start dev server (Express + Vite)
npm run dev

# Type check
npm run check

# Build for production
npm run build

# Start production server
npm start

# Push database schema changes
npm run db:push
npm run db:push --force  # Force push (ignores warnings)
```

### Database Schema Changes

1. Edit `shared/schema.ts`
2. Run `npm run db:push`
3. If warnings appear, review changes
4. Use `npm run db:push --force` if safe to proceed

**CRITICAL**: Never change primary key ID types (serial ↔ varchar) - this breaks existing data.

---

## API Reference

### Authentication

#### POST `/api/register`
Register new user with email/password.

**Body**:
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### POST `/api/login`
Login with email/password.

**Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### POST `/api/auth/google/exchange`
Exchange Firebase ID token for session.

**Body**:
```json
{
  "idToken": "firebase-id-token",
  "email": "user@example.com",
  "displayName": "John Doe",
  "photoURL": "https://..."
}
```

#### GET `/api/auth/session`
Get current session status and user info.

#### POST `/api/auth/signout`
Logout and destroy session.

### Projects

#### GET `/api/projects`
Get all projects for authenticated user (owned + member).

#### POST `/api/projects`
Create new project.

**Body**:
```json
{
  "name": "Project Name",
  "description": "Optional description",
  "color": "#4F46E5"
}
```

#### GET `/api/projects/:id`
Get single project by ID.

#### PATCH `/api/projects/:id`
Update project.

#### POST `/api/projects/:id/invite`
Invite user to project.

#### GET `/api/projects/:id/members`
Get project members.

#### DELETE `/api/projects/:id/members/:userId`
Remove member from project.

### Boards

#### GET `/api/boards`
Get all boards for authenticated user.

#### POST `/api/boards`
Create new board.

**Body**:
```json
{
  "name": "Board Name",
  "description": "Optional description",
  "projectId": 1 // Optional
}
```

#### GET `/api/boards/:id`
Get single board by ID.

#### PATCH `/api/boards/:id`
Update board (includes blocks, phases, etc.).

**Body**: Partial board object

#### DELETE `/api/boards/:id`
Delete board.

#### GET `/api/boards/:id/public`
Get public board view (no auth required).

### AI Storyboard Generation

#### POST `/api/boards/:boardId/columns/:columnId/generate-storyboard`
Generate storyboard image for column using DALL-E 3.

**Rate Limited**: 20 requests/hour per IP

**Body**:
```json
{
  "prompt": "a business owner frustrated at tax time"
}
```

**Response**:
```json
{
  "imageUrl": "https://oaidalleapiprodscus.blob.core.windows.net/...",
  "prompt": "original prompt"
}
```

### Board Comments

#### GET `/api/boards/:boardId/blocks/:blockId/comments`
Get comments for specific block.

#### POST `/api/boards/:boardId/blocks/:blockId/comments`
Create comment on block.

#### POST `/api/boards/:boardId/blocks/:blockId/comments/clear`
Clear all comments on block.

#### PATCH `/api/boards/:boardId/blocks/:blockId/comments/:commentId/toggle`
Toggle comment completion status.

### Notifications

#### GET `/api/notifications`
Get all notifications for user.

**Query**: `?unreadOnly=true` to filter

#### GET `/api/notifications/count`
Get unread notification count.

#### PATCH `/api/notifications/:id/read`
Mark notification as read.

#### PATCH `/api/notifications/mark-all-read`
Mark all notifications as read.

#### DELETE `/api/notifications/:id`
Delete notification.

### Flagged Blocks

#### GET `/api/flagged-blocks`
Get all flagged blocks for user.

#### POST `/api/boards/:boardId/blocks/:blockId/flag`
Flag a block.

**Body**:
```json
{
  "reason": "Follow up on this design"
}
```

#### DELETE `/api/boards/:boardId/blocks/:blockId/unflag`
Unflag a block.

#### PATCH `/api/flagged-blocks/:id/resolve`
Mark flagged block as resolved.

### Google Sheets Integration

#### POST `/api/google-sheets/validate`
Validate Google Sheets URL.

#### POST `/api/google-sheets/data`
Fetch data from Google Sheets.

#### POST `/api/google-sheets/cell`
Fetch specific cell value.

#### GET `/api/google-sheets/:sheetId/tabs`
Get sheet tab names.

### Google Slides Export

#### POST `/api/export-to-slides`
Export board to Google Slides presentation.

**Body**:
```json
{
  "title": "Presentation Title",
  "slides": [ ...slide_data ]
}
```

### PDF Workflow Import

#### POST `/api/boards/:boardId/import-pdf-workflow`
Import workflow steps from PDF using AI.

**Content-Type**: `multipart/form-data`

**Form Data**:
- `pdf`: PDF file (max 10MB)

### Team Management

#### GET `/api/teams/:organizationId/members`
Get team members.

#### POST `/api/teams/:organizationId/invite`
Invite user to team.

#### PATCH `/api/teams/members/:memberId`
Update team member role.

#### DELETE `/api/teams/members/:memberId`
Remove team member.

### Health & Diagnostics

#### GET `/api/health`
Server health check with system metrics.

#### GET `/api/ping`
Simple ping endpoint (returns `{status: "ok"}`).

#### GET `/api/firebase-config`
Get Firebase configuration for client.

#### GET `/api/firebase-diagnostics`
Firebase environment diagnostics.

---

## Deployment

### Replit Deployment

Blupi is deployed on Replit with custom domain support.

#### Production
- **Domain**: `my.blupi.io`
- **Branch**: `production`
- **Database**: Production PostgreSQL
- **Auto-deploy**: Disabled (manual deploys)

#### Staging
- **Domain**: `staging.blupi.io`
- **Branch**: `main`
- **Database**: Staging PostgreSQL
- **Auto-deploy**: Enabled (auto-deploys on push to `main`)

### Build Process

**Development**:
```bash
npm run dev
# Starts Express server with Vite dev middleware on port 5000
```

**Production Build**:
```bash
npm run build
# Builds:
# - Frontend: Vite build → public/
# - Backend: esbuild bundle → dist/index.js
```

**Production Run**:
```bash
npm start
# Runs: NODE_ENV=production node dist/index.js
```

### DNS Configuration (Squarespace)

**Production**:
```
Type: A Record
Host: my
Value: [Replit production IP]
```

**Staging**:
```
Type: CNAME
Host: staging
Value: [username].repl.co
```

### Deployment Workflow

1. **Local Development** → Test on `localhost:5000`
2. **Push to `main`** → Auto-deploys to `staging.blupi.io`
3. **Test on Staging** → Verify functionality
4. **Merge to `production`** → Manually deploy to `my.blupi.io`
5. **Verify Production** → Check `my.blupi.io`

---

## Troubleshooting

### Common Issues

#### Port Already in Use (EADDRINUSE)
```bash
# Find process using port 5000
lsof -i :5000 | grep LISTEN

# Kill the process
kill -9 <PID>

# Restart application
npm run dev
```

#### Database Connection Failed
- Verify `DATABASE_URL` environment variable is set
- Check PostgreSQL database is accessible
- Run `npm run db:push` to sync schema

#### Firebase Auth Errors
- Verify all `VITE_FIREBASE_*` and `FIREBASE_*` env vars are set
- Check Firebase project status in Firebase Console
- Ensure Google OAuth is enabled in Firebase Authentication settings
- Verify `authDomain` matches deployment domain for production

#### AI Image Generation Not Working
- Verify `OPENAI_API_KEY` is set and valid
- Check OpenAI account has available credits
- Review server logs for specific API errors
- Confirm CSP allows DALL-E image URLs

#### WebSocket Connection Issues
- Check browser console for WebSocket errors
- Verify server is running and accessible
- Confirm no proxy/firewall blocking WebSocket connections
- Check for CORS issues

#### Session Lost After Refresh
- Verify `SESSION_SECRET` environment variable is set
- Check session cookie is being set (browser DevTools)
- Ensure `trust proxy` is configured correctly for production

#### Database Schema Mismatch
```bash
# Push current schema to database
npm run db:push

# If data-loss warning appears and safe to proceed
npm run db:push --force
```

### Debugging Tips

1. **Check Logs**: View workflow logs in Replit interface or via `refresh_all_logs` tool
2. **Health Check**: Visit `/api/health` endpoint for system status
3. **Firebase Diagnostics**: Visit `/api/firebase-diagnostics` for Firebase config validation
4. **CSP Violations**: Check browser console for CSP errors, review `/api/debug/csp-info`
5. **Database Inspection**: Use Replit's database pane to inspect tables directly

### Known Limitations

- Session store is in-memory (memorystore) - sessions lost on server restart
- DALL-E 3 image URLs are temporary (~24 hours) - should be proxied/downloaded for permanent storage
- WebSocket connections limited by server resources
- Rate limiting may block legitimate high-frequency requests during development

---

## Additional Resources

- **Drizzle ORM**: https://orm.drizzle.team/
- **TanStack Query**: https://tanstack.com/query/latest
- **Firebase Auth**: https://firebase.google.com/docs/auth
- **OpenAI API**: https://platform.openai.com/docs
- **Wouter**: https://github.com/molefrog/wouter
- **shadcn/ui**: https://ui.shadcn.com/
- **Replit Docs**: https://docs.replit.com/

---

**Last Updated**: November 2025  
**Version**: 1.0  
**Maintained By**: Blupi Development Team
