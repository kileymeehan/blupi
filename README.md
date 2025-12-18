# Blupi - Collaborative Design Platform

## Overview
Blupi is an advanced collaborative product design platform that enables teams to create, manage, and collaborate on design blueprints in real-time. The platform features visual collaboration tools, team management, and integration with external services.

**Production URL**: https://my.blupi.io  
**Staging URL**: https://staging.blupi.io

---

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query (React Query v5)
- **UI Components**: shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS + tailwind-merge + class-variance-authority
- **Forms**: React Hook Form + Zod validation
- **Real-time**: Native WebSocket client
- **Drag & Drop**: @hello-pangea/dnd
- **Charts**: Recharts
- **Icons**: Lucide React + React Icons
- **Animations**: Framer Motion

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM with drizzle-zod
- **Authentication**: Firebase Auth + Express Sessions
- **Real-time**: WebSocket Server (ws library)
- **Security**: Helmet.js, express-rate-limit
- **Session Store**: connect-pg-simple (PostgreSQL-backed sessions)

### Build Tools
- **Bundler**: Vite
- **TypeScript**: tsx for server, Vite for client
- **Database Migrations**: `npm run db:push` (Drizzle Kit)

---

## Project Structure

```
blupi/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # UI components
│   │   │   ├── board/         # Blueprint/board components
│   │   │   ├── ui/            # shadcn/ui components
│   │   │   ├── team/          # Team management
│   │   │   ├── notifications/ # Notification system
│   │   │   ├── google-sheets/ # Google Sheets integration
│   │   │   ├── csv-import/    # CSV/Pendo import
│   │   │   └── figma/         # Figma integration
│   │   ├── pages/             # Route pages
│   │   │   ├── dashboard.tsx  # Main dashboard
│   │   │   ├── board.tsx      # Blueprint editor
│   │   │   ├── project.tsx    # Project view
│   │   │   ├── team.tsx       # Team management
│   │   │   └── auth-page.tsx  # Authentication
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utilities (auth, queryClient)
│   │   └── services/          # API service layers
│   └── public/                # Static assets
├── server/                    # Express backend
│   ├── routes.ts              # All API routes (~3700 lines)
│   ├── storage.ts             # Database operations interface
│   ├── db.ts                  # Drizzle database connection
│   ├── auth.ts                # Passport authentication setup
│   ├── firebase-admin.ts      # Firebase Admin SDK
│   ├── index.ts               # Server entry point
│   ├── vite.ts                # Vite dev server integration
│   └── utils/                 # Service integrations
│       ├── google-sheets.ts   # Google Sheets API
│       ├── google-slides.ts   # Google Slides export
│       ├── openai.ts          # OpenAI/DALL-E (DISABLED)
│       ├── replicate.ts       # Replicate API (DISABLED)
│       ├── sendgrid.ts        # SendGrid email (DISABLED)
│       └── pendo.ts           # Pendo analytics
├── shared/                    # Shared types and schemas
│   └── schema.ts              # Drizzle database schema
└── config/                    # Environment configuration
    └── environment.ts         # Staging/production config
```

---

## Database Schema

### Core Tables

#### `users`
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| email | text | Unique email address |
| username | text | Unique username |
| password | text | Hashed password |
| firstName | text | Optional first name |
| lastName | text | Optional last name |
| profileImageUrl | text | Avatar URL |
| firebaseUid | text | Firebase Auth UID (unique) |
| createdAt | timestamp | Account creation date |

#### `projects`
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| name | text | Project name |
| description | text | Optional description |
| color | text | UI color (hex, default #4F46E5) |
| status | text | draft/active/archived |
| userId | integer | FK to users.id (owner) |
| createdAt | timestamp | Creation date |
| updatedAt | timestamp | Last update |

#### `boards` (Blueprints)
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| name | text | Board name |
| description | text | Optional description |
| segments | text | Legacy field |
| blocks | jsonb | Array of Block objects |
| phases | jsonb | Array of Phase objects (columns) |
| status | text | draft/active/archived |
| projectId | integer | FK to projects.id (optional) |
| userId | integer | FK to users.id (owner) |
| createdAt | timestamp | Creation date |
| updatedAt | timestamp | Last update |

#### `project_members`
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| projectId | integer | FK to projects.id |
| userId | integer | FK to users.id |
| role | text | owner/admin/editor/viewer |
| status | text | pending/active |
| invitedAt | timestamp | Invitation date |
| acceptedAt | timestamp | Acceptance date |

#### `board_permissions`
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| boardId | integer | FK to boards.id |
| userId | integer | FK to users.id |
| role | text | owner/editor/viewer |
| grantedBy | integer | FK to users.id |
| grantedAt | timestamp | Grant date |

#### `team_members`
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| organizationId | integer | Organization ID |
| userId | integer | FK to users.id |
| invitedBy | integer | FK to users.id |
| email | text | Member email |
| role | text | admin/member |
| status | text | pending/active/inactive |

#### `pending_invitations`
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| token | text | Unique invitation token |
| email | text | Invitee email |
| organizationId | integer | Organization ID |
| invitedBy | integer | FK to users.id |
| role | text | Assigned role |
| teamName | text | Team name |
| inviterName | text | Inviter display name |
| expiresAt | timestamp | Expiration date |
| status | text | pending/accepted/expired |

#### `notifications`
| Column | Type | Description |
|--------|------|-------------|
| id | text | UUID primary key |
| toUserId | integer | FK to users.id |
| type | text | team_invitation/comment_mention/etc |
| title | text | Notification title |
| message | text | Notification body |
| meta | jsonb | Additional data |
| read | boolean | Read status |
| createdAt | timestamp | Creation date |

#### `board_comments`
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| boardId | integer | FK to boards.id |
| blockId | text | Block ID within board |
| userId | integer | FK to users.id |
| content | text | Comment text |
| mentions | jsonb | Array of user IDs |
| parentId | integer | Self-reference for threading |
| resolved | boolean | Resolution status |

#### `sheet_documents`
| Column | Type | Description |
|--------|------|-------------|
| id | text | UUID primary key |
| boardId | integer | FK to boards.id |
| name | text | Document name |
| sheetId | text | Google Sheet ID |

#### `flagged_blocks`
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| boardId | integer | FK to boards.id |
| blockId | text | Block ID |
| userId | integer | FK to users.id |
| reason | text | Flag reason |
| resolved | boolean | Resolution status |

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/session` | Check current session |
| POST | `/api/auth/signin` | Email/password sign in |
| POST | `/api/auth/signup` | User registration |
| POST | `/api/auth/signout` | Log out |
| GET | `/api/auth/google` | Initiate Google OAuth |
| GET | `/auth/google-callback` | Google OAuth callback |
| POST | `/api/auth/google/exchange` | Exchange OAuth code for tokens |
| POST | `/api/auth/google-callback` | Create Firebase session |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project details |
| PATCH | `/api/projects/:id` | Update project |
| POST | `/api/projects/:id/invite` | Invite user to project |
| GET | `/api/projects/:id/boards` | List project boards |
| GET | `/api/projects/:id/members` | List project members |
| POST | `/api/projects/:id/members` | Add project member |
| PATCH | `/api/projects/:id/members/:userId` | Update member role |
| DELETE | `/api/projects/:id/members/:userId` | Remove member |

### Boards (Blueprints)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards` | List user's boards |
| POST | `/api/boards` | Create board |
| GET | `/api/boards/:id` | Get board details |
| PATCH | `/api/boards/:id` | Update board |
| DELETE | `/api/boards/:id` | Delete board |
| GET | `/api/boards/:id/public` | Get public board data |
| POST | `/api/boards/:boardId/permissions` | Grant permission |
| DELETE | `/api/boards/:boardId/permissions/:userId` | Revoke permission |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards/:boardId/blocks/:blockId/comments` | Get block comments |
| POST | `/api/boards/:boardId/blocks/:blockId/comments` | Add comment |
| POST | `/api/boards/:boardId/blocks/:blockId/comments/clear` | Clear all comments |
| PATCH | `/api/boards/:boardId/blocks/:blockId/comments/:commentId/toggle` | Toggle comment status |

### Teams
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/teams/:organizationId/members` | List team members |
| POST | `/api/teams/:organizationId/invite` | Invite to team |
| PATCH | `/api/teams/members/:memberId` | Update member role |
| DELETE | `/api/teams/members/:memberId` | Remove member |
| GET | `/api/teams/:organizationId/pending-invitations` | List pending invites |
| DELETE | `/api/teams/pending-invitations/:invitationId` | Cancel invitation |
| POST | `/api/teams/invitations/:invitationId/resend` | Resend invitation |

### Invitations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invite/:token` | Get invitation details |
| POST | `/api/invite/:token/accept` | Accept invitation |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | List notifications |
| GET | `/api/notifications/count` | Get unread count |
| PATCH | `/api/notifications/:id/read` | Mark as read |
| PATCH | `/api/notifications/read-all` | Mark all as read |
| DELETE | `/api/notifications/:id` | Delete notification |

### Google Sheets Integration
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/google-sheets/validate` | Validate sheet URL |
| POST | `/api/google-sheets/data` | Fetch sheet data as CSV |
| GET | `/api/google-sheets/:sheetId/tabs` | Get sheet tabs |
| POST | `/api/google-sheets/cell` | Fetch specific cell/range |
| POST | `/api/google-sheets/connectivity-test` | Test sheet connectivity |
| GET | `/api/boards/:boardId/sheet-documents` | List linked sheets |
| POST | `/api/boards/:boardId/sheet-documents` | Link sheet to board |
| PUT | `/api/boards/:boardId/sheet-documents/:id` | Update sheet link |
| DELETE | `/api/boards/:boardId/sheet-documents/:id` | Remove sheet link |
| POST | `/api/projects/:projectId/boards/import-sheet` | Import sheet as board |

### Exports
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/export-to-slides` | Export to Google Slides |
| POST | `/api/export/google-slides` | Export to Google Slides |
| POST | `/api/export/google-docs` | Export to Google Docs |

### Flagged Blocks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/boards/:boardId/blocks/:blockId/flag` | Flag a block |
| DELETE | `/api/boards/:boardId/blocks/:blockId/unflag` | Unflag a block |
| GET | `/api/flagged-blocks` | List flagged blocks |
| PATCH | `/api/flagged-blocks/:id/resolve` | Resolve flagged block |
| DELETE | `/api/flagged-blocks/:id` | Delete flagged record |

### Figma Integration
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/figma/files/:fileKey` | Get Figma file info |
| GET | `/api/figma/files/:fileKey/images` | Get component images |
| POST | `/api/figma/files/:fileKey/search` | Search components |

### Pendo Integration
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pendo/status` | Check Pendo connection |
| GET | `/api/pendo/authorize` | Initiate Pendo OAuth |
| GET | `/api/pendo/callback` | Pendo OAuth callback |
| GET | `/api/pendo/friction/:id` | Get friction metrics |

### Utility
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/ping` | Liveness check |
| POST | `/api/proxy-image` | Proxy external images |
| GET | `/api/firebase-config` | Get Firebase config |
| GET | `/api/firebase-diagnostics` | Firebase diagnostics |

### WebSocket
| Path | Description |
|------|-------------|
| `/ws` | Real-time collaboration (board presence, updates) |

### DISABLED Endpoints (AI Features)
| Method | Endpoint | Status |
|--------|----------|--------|
| POST | `/api/boards/:boardId/generate-storyboard` | Returns 503 |
| POST | `/api/boards/:boardId/import-pdf-workflow` | Returns 503 |
| POST | `/api/analyze-csv` | Returns 503 |

---

## Environment Variables

### Required
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Express session secret |
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |

### Optional (Currently Disabled)
| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key (for DALL-E) |
| `REPLICATE_API_TOKEN` | Replicate API token |
| `SENDGRID_API_KEY` | SendGrid email service |

### Google APIs
| Variable | Description |
|----------|-------------|
| `GOOGLE_API_KEY` | Google API key |
| `GOOGLE_CLIENT_ID` | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |

---

## External Integrations

### Active
1. **Firebase Auth** - User authentication with Google OAuth
2. **Google Sheets** - Data import and live metrics
3. **Google Slides/Docs** - Export functionality
4. **Pendo** - Product analytics integration
5. **Figma** - Design component import

### Temporarily Disabled
1. **OpenAI/DALL-E 3** - AI storyboard image generation
2. **Replicate (Stable Diffusion XL)** - Alternative AI image generation
3. **SendGrid** - Team invitation emails

---

## Key Features

### Blueprint Editor
- Visual board with phases (columns) and blocks
- Drag-and-drop block arrangement
- Block types: text, image, video, metrics
- Real-time collaborative editing via WebSocket
- Comments with @mentions and threading
- Block flagging for review

### Team Collaboration
- Project-based organization
- Role-based access (owner, admin, editor, viewer)
- Email invitations with tokenized links
- Real-time presence indicators

### Data Integration
- Google Sheets live data embedding
- CSV import (Pendo analytics)
- Export to Google Slides/Docs

---

## Commands

```bash
# Development
npm run dev          # Start dev server (frontend + backend)
npm run db:push      # Push schema changes to database

# Production
npm run build        # Build for production
npm run start        # Start production server
```

---

## Current Status

**Deployment Target**: staging.blupi.io

**Disabled Features** (to enable deployment without API keys):
- AI storyboard generation (OpenAI/DALL-E, Replicate)
- SendGrid email invitations
- PDF workflow import
- CSV AI analysis

**Active Features**:
- Full blueprint editing and collaboration
- Real-time WebSocket presence
- Team and project management
- Google Sheets integration
- Export functionality
- Notifications system
- Comment system with threading
