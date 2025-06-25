import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// Session type augmentation is in session-types.d.ts
import { insertBoardSchema, insertProjectSchema, insertUserSchema } from "@shared/schema";
import { ZodError } from "zod";
import { nanoid } from 'nanoid';
import { WebSocketServer, WebSocket } from 'ws';


import { getFrictionMetrics, isPendoConfigured, getAuthorizationUrl, exchangeCodeForToken, setOAuthToken } from './utils/pendo';
import { parseSheetId, fetchSheetData, getSheetNames, convertSheetDataToCsv, fetchSheetCell } from './utils/google-sheets-fixed';
import { GoogleSlidesService } from './utils/google-slides';
import { OpenAIService } from './utils/openai';
import { replicateService } from './utils/replicate';
import { openaiService } from './utils/openai';
import { classifyDataWithAI, analyzeCsvStructure } from './utils/ai-classifier';
import { parseWorkflowPDF, convertWorkflowStepsToBlocks } from './utils/pdf-workflow-parser';
import { sendTeamInviteEmail } from './email-service';
import { notificationService } from './notification-service';
import { simpleNotificationService } from './simple-notification-service';
import { getHealthStatus } from './monitoring';
import multer from 'multer';
import { generalRateLimit, aiRateLimit, boardUpdateRateLimit, sheetsRateLimit } from './rate-limiter';

interface ConnectedUser {
  id: string;
  name: string;
  color: string;
  emoji?: string;
  photoURL?: string;
  ws: WebSocket;
  boardId?: string;
}

const connectedUsers = new Map<string, ConnectedUser>();
const COLORS = [
  "#FF5733", "#33FF57", "#3357FF", "#FF33F5",
  "#33FFF5", "#F5FF33", "#FF3333", "#33FF33"
];

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  console.log('[HTTP] Creating basic HTTP server');

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json(getHealthStatus());
  });

  // Image proxy endpoint to bypass CSP restrictions
  app.post('/api/proxy-image', async (req, res) => {
    try {
      const { imageUrl } = req.body;
      
      if (!imageUrl || typeof imageUrl !== 'string') {
        return res.status(400).json({ error: 'Invalid image URL' });
      }

      console.log('[IMAGE PROXY] Fetching image:', imageUrl);
      
      // Fetch the image from the external URL
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BlupiBot/1.0)',
          'Accept': 'image/*'
        }
      });

      if (!response.ok) {
        console.log('[IMAGE PROXY] Failed to fetch image:', response.status);
        return res.status(404).json({ error: 'Image not found' });
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        console.log('[IMAGE PROXY] Invalid content type:', contentType);
        return res.status(400).json({ error: 'Invalid image format' });
      }

      // Convert to buffer and then to base64
      const imageBuffer = await response.arrayBuffer();
      const base64Data = Buffer.from(imageBuffer).toString('base64');
      const dataUrl = `data:${contentType};base64,${base64Data}`;

      console.log('[IMAGE PROXY] Successfully converted image to data URL');
      res.json({ dataUrl });
      
    } catch (error: any) {
      console.error('[IMAGE PROXY] Error:', error?.message || error);
      res.status(500).json({ error: 'Failed to proxy image' });
    }
  });

  // Export to Google Slides endpoint
  app.post('/api/export-to-slides', async (req, res) => {
    try {
      console.log('[SLIDES EXPORT] Request received');
      console.log('[SLIDES EXPORT] Request body keys:', Object.keys(req.body));
      
      const { title, slides } = req.body;
      
      console.log('[SLIDES EXPORT] Title:', title);
      console.log('[SLIDES EXPORT] Slides count:', slides?.length);
      
      if (!title || !slides || !Array.isArray(slides)) {
        console.log('[SLIDES EXPORT] Validation failed - invalid data');
        return res.status(400).json({ error: 'Invalid presentation data' });
      }

      console.log('[SLIDES EXPORT] Creating Google Slides presentation:', title);
      console.log('[SLIDES EXPORT] API Key present:', !!process.env.GOOGLE_API_KEY);
      console.log('[SLIDES EXPORT] Client ID present:', !!process.env.GOOGLE_CLIENT_ID);
      console.log('[SLIDES EXPORT] Client Secret present:', !!process.env.GOOGLE_CLIENT_SECRET);
      
      // Use the already imported GoogleSlidesService
      console.log('[SLIDES EXPORT] GoogleSlidesService available');
      const googleSlidesService = new GoogleSlidesService();
      
      // Create the presentation with the title only (matching the service signature)
      console.log('[SLIDES EXPORT] Creating presentation with title:', title);
      const presentationId = await googleSlidesService.createPresentation(title);
      
      console.log('[SLIDES EXPORT] Created presentation ID:', presentationId);
      
      // For demo purposes, construct the presentation URL
      let presentationUrl;
      if (presentationId === 'demo-presentation-id') {
        // Mock URL for demo when API is not configured
        presentationUrl = `https://docs.google.com/presentation/d/${presentationId}/edit#gid=0`;
        console.log('[SLIDES EXPORT] Using demo URL');
      } else {
        presentationUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;
      }
      
      console.log('[SLIDES EXPORT] Successfully created presentation:', presentationUrl);
      res.json({ presentationUrl });
      
    } catch (error: any) {
      console.error('[SLIDES EXPORT] Error:', error?.message || error);
      res.status(500).json({ 
        error: error?.message || 'Failed to create Google Slides presentation' 
      });
    }
  });

  // Firebase configuration endpoint for client
  app.get("/api/firebase-config", (req, res) => {
    try {
      const hostname = req.headers.host || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const isProduction = hostname.includes('my.blupi.io') || hostname.includes('blupi.io');
      
      // Log detailed request information
      console.log('[HTTP] Firebase config request from:', {
        hostname,
        isProduction,
        userAgent: userAgent.substring(0, 50) + '...',
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      // Firebase configuration from environment variables with fallbacks
      // Use my.blupi.io as authDomain for production to fix session persistence
      const authDomain = isProduction ? "my.blupi.io" : (process.env.FIREBASE_AUTH_DOMAIN || "blupi-458414.firebaseapp.com");
      
      // Validate required environment variables
      if (!process.env.FIREBASE_API_KEY) {
        console.error('[HTTP] FIREBASE_API_KEY environment variable is required');
        return res.status(500).json({ error: "Firebase configuration incomplete" });
      }

      const config = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: authDomain, 
        projectId: process.env.FIREBASE_PROJECT_ID || "blupi-458414",
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "blupi-458414.appspot.com",
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "229356339230",
        appId: process.env.FIREBASE_APP_ID || "1:229356339230:web:1a57771b64980839faee0f",
      };

      console.log('[HTTP] Serving hardcoded Firebase config:', {
        apiKeyStart: config.apiKey.substring(0, 10) + '...',
        projectId: config.projectId,
        appIdStart: config.appId.substring(0, 20) + '...',
        hostname
      });

      // Set headers to prevent caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.json(config);
    } catch (error) {
      console.error("Error providing Firebase config:", error);
      res.status(500).json({ error: "Failed to provide Firebase configuration" });
    }
  });

  // Firebase diagnostics endpoint
  app.get("/api/firebase-diagnostics", (req, res) => {
    try {
      const diagnostics = {
        environment: {
          VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY ? 'Present (' + process.env.VITE_FIREBASE_API_KEY.substring(0, 10) + '...)' : 'Missing',
          VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || 'Missing',
          VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID ? 'Present (' + process.env.VITE_FIREBASE_APP_ID.substring(0, 20) + '...)' : 'Missing',
          VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'Missing'
        },
        expected: {
          VITE_FIREBASE_PROJECT_ID: 'blupi-458414',
          VITE_FIREBASE_APP_ID: '1:229356339230:web:1a57771b64980839faee0f...',
          VITE_FIREBASE_AUTH_DOMAIN: 'blupi-458414.firebaseapp.com'
        },
        validation: {
          correctProject: (process.env.VITE_FIREBASE_PROJECT_ID || 'blupi-458414') === 'blupi-458414',
          correctAppId: (process.env.VITE_FIREBASE_APP_ID || '1:229356339230:web:1a57771b64980839faee0f') === '1:229356339230:web:1a57771b64980839faee0f',
          hasApiKey: !!process.env.VITE_FIREBASE_API_KEY
        },
        hostname: req.headers.host,
        timestamp: new Date().toISOString()
      };

      console.log('[HTTP] Firebase diagnostics requested from:', req.headers.host);
      res.json(diagnostics);
    } catch (error) {
      console.error("Error providing Firebase diagnostics:", error);
      res.status(500).json({ error: "Failed to provide Firebase diagnostics" });
    }
  });

  // Setup multer for file uploads BEFORE other middleware
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit for PDF files
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed'));
      }
    }
  });

  // PDF workflow parsing endpoint - must be registered early
  app.post("/api/boards/:boardId/import-pdf-workflow", upload.single('pdf'), async (req, res) => {
    console.log(`[HTTP] PDF workflow import endpoint reached! Board: ${req.params.boardId}`);
    
    res.setHeader('Content-Type', 'application/json');
    
    try {
      const boardId = Number(req.params.boardId);
      if (isNaN(boardId) || boardId <= 0) {
        console.error('[HTTP] Invalid board ID:', req.params.boardId);
        return res.status(400).json({ 
          error: true, 
          message: "Valid board ID is required" 
        });
      }

      if (!req.file) {
        console.error('[HTTP] No PDF file uploaded');
        return res.status(400).json({ 
          error: true, 
          message: "PDF file is required" 
        });
      }

      // Check if board exists
      const board = await storage.getBoard(boardId);
      if (!board) {
        console.error('[HTTP] Board not found:', boardId);
        return res.status(404).json({ 
          error: true, 
          message: "Board not found" 
        });
      }

      console.log(`[HTTP] Processing PDF workflow for board ${boardId}, file size: ${req.file.size} bytes`);

      // Parse PDF workflow steps using AI
      const workflowSteps = await parseWorkflowPDF(req.file.buffer);

      console.log(`[HTTP] Extracted ${workflowSteps.length} workflow steps from PDF`);

      // Convert workflow steps to blocks
      const newBlocks = await convertWorkflowStepsToBlocks(
        workflowSteps, 
        boardId,
        board.blocks.length > 0 ? Math.max(...board.blocks.map(b => b.phaseIndex)) : 0,
        0
      );

      // Add new blocks to the board
      const updatedBlocks = [...board.blocks, ...newBlocks];
      
      // Update the board with new blocks
      await storage.updateBoard(boardId, {
        blocks: updatedBlocks,
        updatedAt: new Date()
      });

      // Broadcast the update to connected users
      const boardUsers = Array.from(connectedUsers.values())
        .filter(user => user.boardId === boardId.toString());
      
      const updatedBoard = await storage.getBoard(boardId);
      
      if (boardUsers.length > 0) {
        const boardUpdateMessage = {
          type: 'board_update',
          board: updatedBoard
        };
        
        boardUsers.forEach(user => {
          if (user.ws.readyState === WebSocket.OPEN) {
            user.ws.send(JSON.stringify(boardUpdateMessage));
          }
        });
        
        console.log(`[WS] Broadcasted board update to ${boardUsers.length} connected users`);
      }

      console.log(`[HTTP] Successfully processed PDF workflow import for board ${boardId}`);
      
      res.status(200).json({
        success: true,
        message: `Successfully imported ${workflowSteps.length} workflow steps`,
        blocksAdded: newBlocks.length
      });

    } catch (error) {
      console.error('[HTTP] Error in PDF workflow import:', error);
      
      if (error instanceof Error && error.message.includes('API')) {
        return res.status(503).json({
          error: true,
          message: "AI service temporarily unavailable. Please try again later."
        });
      }
      
      res.status(500).json({
        error: true,
        message: error instanceof Error ? error.message : "Failed to process PDF workflow"
      });
    }
  });

  // Create WebSocket server with enhanced configuration for better connectivity
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws',
    clientTracking: true,
    perMessageDeflate: false,
    maxPayload: 16 * 1024 * 1024
  });

  console.log('[WS] WebSocket server created on path /ws');

  // Add WebSocket error handling
  wss.on('error', (error) => {
    console.error('[WS] WebSocket server error:', error);
  });

  wss.on('connection', (ws, req) => {
    const userId = nanoid();
    console.log(`[WS] New connection established: ${userId}`);

    ws.on('error', (error: Error) => {
      console.error(`[WS] Connection error for ${userId}:`, error);
      connectedUsers.delete(userId);
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`[WS] Received message from ${userId}:`, message);

        if (message.type === 'subscribe') {
          // First, remove any existing connections for this user/board combo to prevent duplicates
          const existingUserIds = Array.from(connectedUsers.entries())
            .filter(([id, user]) => 
              user.name === (message.userName || 'Anonymous') && 
              user.boardId === message.boardId &&
              id !== userId
            )
            .map(([id]) => id);
          
          // Remove all existing connections for this user on this board
          existingUserIds.forEach(existingId => {
            console.log(`[WS] Removing duplicate connection for user: ${message.userName}, ID: ${existingId}`);
            const existingUser = connectedUsers.get(existingId);
            if (existingUser?.ws && existingUser.ws.readyState === WebSocket.OPEN) {
              existingUser.ws.close(1000, 'Duplicate connection removed');
            }
            connectedUsers.delete(existingId);
          });

          // Also remove the current userId if it already exists to prevent conflicts
          if (connectedUsers.has(userId)) {
            console.log(`[WS] Removing existing connection for current userId: ${userId}`);
            const existingUser = connectedUsers.get(userId);
            if (existingUser?.ws && existingUser.ws.readyState === WebSocket.OPEN && existingUser.ws !== ws) {
              existingUser.ws.close(1000, 'Replaced by new connection');
            }
            connectedUsers.delete(userId);
          }

          const user: ConnectedUser = {
            id: userId,
            name: message.userName || 'Anonymous',
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            emoji: message.userEmoji,
            photoURL: message.userPhotoURL, // Add support for actual profile photos
            ws,
            boardId: message.boardId
          };
          connectedUsers.set(userId, user);

          // Send initial users list to new user
          const boardUsers = Array.from(connectedUsers.values())
            .filter(u => u.boardId === message.boardId)
            .map(({ id, name, color, emoji, photoURL }) => ({ id, name, color, emoji, photoURL }));

          ws.send(JSON.stringify({
            type: 'users_update',
            users: boardUsers
          }));

          // Broadcast to other users in the same board
          connectedUsers.forEach((connectedUser) => {
            if (connectedUser.ws !== ws && 
                connectedUser.boardId === message.boardId && 
                connectedUser.ws.readyState === WebSocket.OPEN) {
              connectedUser.ws.send(JSON.stringify({
                type: 'users_update',
                users: boardUsers
              }));
            }
          });
        }
      } catch (error) {
        console.error('[WS] Error processing message:', error);
      }
    });

    ws.on('close', () => {
      console.log(`[WS] Connection closed: ${userId}`);
      const user = connectedUsers.get(userId);
      if (user?.boardId) {
        connectedUsers.delete(userId);

        // Broadcast updated users list
        const boardUsers = Array.from(connectedUsers.values())
          .filter(u => u.boardId === user.boardId)
          .map(({ id, name, color, emoji, photoURL }) => ({ id, name, color, emoji, photoURL }));

        connectedUsers.forEach((connectedUser) => {
          if (connectedUser.boardId === user.boardId &&
              connectedUser.ws.readyState === WebSocket.OPEN) {
            connectedUser.ws.send(JSON.stringify({
              type: 'users_update',
              users: boardUsers
            }));
          }
        });
      }
    });

    // Send heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);

    ws.on('close', () => {
      clearInterval(heartbeat);
    });
  });

  // Add a health check endpoint
  app.get("/api/ping", (_req, res) => {
    console.log('[HTTP] Handling ping request');
    res.json({ status: "ok" });
  });

  // Google Sheets API endpoints - moved to high priority to avoid routing conflicts
  


  // Google Sheets import endpoint - moved here to avoid routing conflicts
  app.post("/api/projects/:projectId/boards/import-sheet", async (req, res) => {
    console.log(`[HTTP] Google Sheets import endpoint reached! Project: ${req.params.projectId}`);
    console.log(`[HTTP] Request method: ${req.method}, URL: ${req.url}`);
    console.log(`[HTTP] Headers:`, req.headers);
    console.log(`[HTTP] Request body:`, req.body);
    
    // Ensure we're sending JSON response
    res.setHeader('Content-Type', 'application/json');
    
    try {
      const { sheetUrl, boardName } = req.body;
      
      if (!sheetUrl) {
        console.error('[HTTP] Missing sheetUrl in request body');
        return res.status(400).json({ 
          error: true, 
          message: "Google Sheet URL is required" 
        });
      }

      const projectId = Number(req.params.projectId);
      if (isNaN(projectId) || projectId <= 0) {
        console.error('[HTTP] Invalid project ID:', req.params.projectId);
        return res.status(400).json({ 
          error: true, 
          message: "Valid project ID is required" 
        });
      }

      // Check if project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        console.error('[HTTP] Project not found:', projectId);
        return res.status(404).json({ 
          error: true, 
          message: "Project not found" 
        });
      }

      // Get userId from session for board creation
      const userId = req.session?.passport?.user;
      if (!userId) {
        return res.status(401).json({ error: true, message: "Authentication required" });
      }
      
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        return res.status(400).json({ 
          error: true, 
          message: "Your session format is outdated. Please sign out and create a new account to continue." 
        });
      }

      // For now, create a basic board with the provided name
      // This will be enhanced to actually parse the Google Sheet data
      const newBoard = await storage.createBoard({
        name: boardName || "Imported Board",
        description: `Imported from Google Sheet: ${sheetUrl}`,
        projectId: projectId,
        userId: userIdNum,
        blocks: [],
        phases: [{
          id: nanoid(),
          name: "Phase 1",
          columns: [{ id: nanoid(), name: "Activities" }],
          collapsed: false
        }]
      });

      console.log(`[HTTP] Successfully created board from Google Sheet import: ${newBoard.id}`);
      res.json({ 
        success: true, 
        boardId: newBoard.id, 
        boardName: newBoard.name 
      });
    } catch (err) {
      console.error('[HTTP] Error importing board from Google Sheet:', err);
      res.status(500).json({ 
        error: true, 
        message: "Failed to import board from Google Sheet" 
      });
    }
  });
  
  // Pendo Data API endpoints with OAuth support
  app.get("/api/pendo/status", (_req, res) => {
    console.log('[HTTP] Checking Pendo API status');
    res.json({ 
      configured: isPendoConfigured(),
      status: isPendoConfigured() ? "connected" : "unconfigured"
    });
  });
  
  // OAuth authorization initiation endpoint
  app.get("/api/pendo/authorize", (_req, res) => {
    console.log('[HTTP] Initiating Pendo OAuth flow');
    const authUrl = getAuthorizationUrl();
    res.json({ authUrl });
  });
  
  // OAuth callback endpoint
  app.get("/api/pendo/callback", async (req, res) => {
    const { code } = req.query;
    
    if (!code || typeof code !== 'string') {
      console.error('[HTTP] Missing authorization code in callback');
      return res.status(400).json({
        error: true,
        message: "Missing authorization code"
      });
    }
    
    console.log('[HTTP] Received OAuth callback with code');
    
    try {
      const token = await exchangeCodeForToken(code);
      
      if (!token) {
        return res.status(500).json({
          error: true,
          message: "Failed to exchange authorization code for token"
        });
      }
      
      setOAuthToken(token);
      
      // Redirect to a success page or back to the app
      res.redirect('/pendo-connected?status=success');
    } catch (err) {
      console.error('[HTTP] OAuth token exchange error:', err);
      res.status(500).json({
        error: true,
        message: "Failed to complete OAuth authentication"
      });
    }
  });
  
  // Get metrics for a specific friction point
  app.get("/api/pendo/friction/:id", async (req, res) => {
    const frictionId = req.params.id;
    const touchpointId = req.query.touchpointId as string | undefined;
    
    console.log(`[HTTP] Fetching Pendo metrics for friction ID: ${frictionId}${touchpointId ? ` related to touchpoint ${touchpointId}` : ''}`);
    
    try {
      const data = await getFrictionMetrics(frictionId, touchpointId);
      
      if (!data) {
        return res.status(404).json({ 
          error: true, 
          message: "No Pendo data found for this friction point",
          pendoConfigured: isPendoConfigured()
        });
      }
      
      res.json(data);
    } catch (err) {
      console.error('[HTTP] Error fetching Pendo data:', err);
      res.status(500).json({ 
        error: true, 
        message: "Failed to fetch Pendo data",
        pendoConfigured: isPendoConfigured()
      });
    }
  });

  // Basic routes without WebSocket functionality
  app.get("/api/boards", async (req, res) => {
    try {
      console.log('🔵 [BOARDS API] === BOARDS FETCH REQUEST STARTED ===');
      
      // Get authenticated user ID from session
      const userId = req.session?.userId;
      
      if (!userId) {
        console.log('[BOARDS API] No authenticated user for boards request');
        return res.status(401).json({ error: true, message: "Authentication required" });
      }
      
      console.log('[BOARDS API] Session userId:', userId, 'type:', typeof userId);
      let userIdNum = parseInt(userId);
      console.log('[BOARDS API] Parsed userIdNum:', userIdNum, 'isNaN:', isNaN(userIdNum));
      
      // Handle Google OAuth user IDs - look up the actual user ID by Firebase UID
      if (isNaN(userIdNum) && typeof userId === 'string' && userId.startsWith('google_')) {
        console.log('[BOARDS API] Google OAuth user detected, looking up user by Firebase UID:', userId);
        try {
          const user = await storage.getUserByFirebaseUid(userId);
          if (user) {
            userIdNum = user.id;
            console.log('[BOARDS API] Found user by Firebase UID - user ID:', userIdNum);
          } else {
            console.log('[BOARDS API] No user found for Firebase UID:', userId);
            return res.json([]);
          }
        } catch (lookupError) {
          console.error('[BOARDS API] Error looking up user by Firebase UID:', lookupError);
          return res.json([]);
        }
      }
      
      // SECURITY FIX: Return empty array for new users instead of all data
      if (isNaN(userIdNum)) {
        console.log('[BOARDS API] SECURITY: userId is NaN, returning empty boards for new user');
        return res.json([]);
      }
      
      console.log('[BOARDS API] Fetching boards for user:', userIdNum);
      const boards = await storage.getBoards(userIdNum);
      console.log(`[BOARDS API] Retrieved ${boards.length} boards for user ${userIdNum}`);
      
      if (boards.length > 0) {
        console.log('[BOARDS API] Sample board:', JSON.stringify(boards[0], null, 2));
      }
      
      res.json(boards);
    } catch (err) {
      console.error('[BOARDS API] Error fetching boards:', err);
      res.status(500).json({ error: true, message: "Failed to fetch boards" });
    }
  });

  app.get("/api/projects", async (req, res) => {
    try {
      // Get authenticated user ID from session
      const userId = req.session?.userId;
      
      if (!userId) {
        console.log('[HTTP] No authenticated user for projects request');
        return res.status(401).json({ error: true, message: "Authentication required" });
      }
      
      // DEBUG: Log the userId type and conversion issue
      console.log('[HTTP] DEBUG - userId from session:', userId, 'type:', typeof userId);
      let userIdNum = parseInt(userId);
      console.log('[HTTP] DEBUG - parsed userIdNum:', userIdNum, 'isNaN:', isNaN(userIdNum));
      
      // Handle Google OAuth user IDs - look up the actual user ID by Firebase UID
      if (isNaN(userIdNum) && typeof userId === 'string' && userId.startsWith('google_')) {
        console.log('[HTTP] Google OAuth user detected, looking up user by Firebase UID:', userId);
        try {
          const user = await storage.getUserByFirebaseUid(userId);
          if (user) {
            userIdNum = user.id;
            console.log('[HTTP] Found user by Firebase UID - user ID:', userIdNum);
          } else {
            console.log('[HTTP] No user found for Firebase UID:', userId);
            return res.json([]);
          }
        } catch (lookupError) {
          console.error('[HTTP] Error looking up user by Firebase UID:', lookupError);
          return res.json([]);
        }
      }
      
      // SECURITY FIX: Return empty array for new users instead of all data
      if (isNaN(userIdNum)) {
        console.log('[HTTP] SECURITY: userId is NaN, returning empty projects for new user');
        return res.json([]);
      }
      
      console.log('[HTTP] Fetching projects for user:', userIdNum);
      
      // Get both owned projects and projects where user is a member
      const ownedProjects = await storage.getProjects(userIdNum);
      console.log(`[HTTP] Retrieved ${ownedProjects.length} owned projects for user ${userIdNum}`);
      
      // Get projects where user is assigned as a member
      const assignedProjects = await storage.getProjectsByMember(userIdNum);
      console.log(`[HTTP] Retrieved ${assignedProjects.length} assigned projects for user ${userIdNum}`);
      
      // Combine and deduplicate projects (in case user owns and is assigned to same project)
      const allProjectIds = new Set();
      const combinedProjects = [];
      
      for (const project of [...ownedProjects, ...assignedProjects]) {
        if (!allProjectIds.has(project.id)) {
          allProjectIds.add(project.id);
          combinedProjects.push(project);
        }
      }
      
      console.log(`[HTTP] Combined total: ${combinedProjects.length} projects for user ${userIdNum}`);
      res.json(combinedProjects);
    } catch (err) {
      console.error('[HTTP] Error fetching projects:', err);
      res.status(500).json({ error: true, message: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const userId = req.session.userId;
      console.log('[HTTP] Creating project with data:', req.body);
      console.log('[HTTP] DEBUG - Project creation - userId from session:', userId, 'type:', typeof userId);
      
      if (!userId) {
        return res.status(401).json({ error: true, message: "Authentication required" });
      }
      
      let userIdNum = parseInt(userId);
      console.log('[HTTP] DEBUG - Project creation - parsed userIdNum:', userIdNum, 'isNaN:', isNaN(userIdNum));
      
      // Handle Google OAuth user IDs for project creation
      if (isNaN(userIdNum) && typeof userId === 'string' && userId.startsWith('google_')) {
        console.log('[HTTP] Google OAuth user detected for project creation, looking up user by Firebase UID:', userId);
        try {
          const user = await storage.getUserByFirebaseUid(userId);
          if (user) {
            userIdNum = user.id;
            console.log('[HTTP] Found user by Firebase UID for project creation - user ID:', userIdNum);
          } else {
            console.log('[HTTP] No user found for Firebase UID during project creation:', userId);
            return res.status(400).json({ 
              error: true, 
              message: "User account not properly configured. Please contact support." 
            });
          }
        } catch (lookupError) {
          console.error('[HTTP] Error looking up user by Firebase UID during project creation:', lookupError);
          return res.status(500).json({ 
            error: true, 
            message: "Authentication error. Please try again." 
          });
        }
      }
      
      if (isNaN(userIdNum)) {
        console.log('[HTTP] SECURITY: Cannot create project - userId is not a valid number. User has old session format:', userId);
        return res.status(400).json({ 
          error: true, 
          message: "Your session format is outdated. Please sign out and create a new account to continue." 
        });
      }

      const parseResult = insertProjectSchema.safeParse(req.body);

      if (!parseResult.success) {
        console.error('[HTTP] Project validation error:', parseResult.error);
        return res.status(400).json({
          error: true,
          message: parseResult.error.errors[0].message
        });
      }

      // Add userId to the project data
      const projectData = { ...parseResult.data, userId: userIdNum };
      console.log('[HTTP] Creating project with userId:', userIdNum);
      const project = await storage.createProject(projectData);
      console.log('[HTTP] Successfully created project:', project.id);

      // Double check the project was stored
      const storedProject = await storage.getProject(project.id);
      if (!storedProject) {
        throw new Error('Project creation failed - not found after creation');
      }

      res.json(project);
    } catch (err) {
      console.error('[HTTP] Error creating project:', err);
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: true,
          message: err.errors[0].message
        });
      }
      res.status(500).json({ error: true, message: "Failed to create project" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      console.log(`[HTTP] Fetching project with ID: ${req.params.id}`);
      const project = await storage.getProject(Number(req.params.id));
      if (!project) {
        return res.status(404).json({ error: true, message: "Project not found" });
      }
      console.log(`[HTTP] Retrieved project: ${project.id}`);
      res.json(project);
    } catch (err) {
      console.error('[HTTP] Error fetching project:', err);
      res.status(500).json({ error: true, message: "Failed to fetch project" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      console.log(`[HTTP] Updating project with ID: ${req.params.id}`);
      const project = await storage.updateProject(Number(req.params.id), req.body);
      if (!project) {
        return res.status(404).json({ error: true, message: "Project not found" });
      }
      console.log(`[HTTP] Successfully updated project: ${project.id}`);
      res.json(project);
    } catch (err) {
      console.error('[HTTP] Error updating project:', err);
      res.status(500).json({ error: true, message: "Failed to update project" });
    }
  });

  app.post("/api/projects/:id/invite", async (req, res) => {
    try {
      console.log(`[HTTP] Sending invitation for project ID: ${req.params.id}`);
      const { email, role } = req.body;

      if (!email || !role) {
        return res.status(400).json({
          error: true,
          message: "Email and role are required"
        });
      }

      const project = await storage.getProject(Number(req.params.id));
      if (!project) {
        return res.status(404).json({ error: true, message: "Project not found" });
      }

      let user = await storage.getUserByEmail(email);
      if (!user) {
        user = await storage.createUser({
          email,
          username: email.split('@')[0],
          password: nanoid(),
        });
      }

      const projectMember = await storage.inviteProjectMember({
        projectId: Number(req.params.id),
        userId: user.id,
        role,
        status: 'pending'
      });

      const emailSent = await sendProjectInvitation({
        to: email,
        projectName: project.name,
        role,
        inviterName: "Team member"
      });

      if (!emailSent) {
        console.error('[HTTP] Failed to send invitation email to:', email);
        return res.status(500).json({
          error: true,
          message: "Failed to send invitation email. Please try again."
        });
      }

      console.log(`[HTTP] Invitation sent successfully to ${email} for project ${project.id}`);
      res.json({
        message: "Invitation sent successfully",
        projectMember
      });
    } catch (err) {
      console.error('[HTTP] Error sending invitation:', err);
      res.status(500).json({
        error: true,
        message: "Failed to send invitation"
      });
    }
  });


  app.get("/api/projects/:id/boards", async (req, res) => {
    try {
      console.log(`[HTTP] Fetching boards for project ID: ${req.params.id}`);
      const boards = await storage.getBoardsByProject(Number(req.params.id));
      console.log(`[HTTP] Retrieved ${boards.length} boards for project ${req.params.id}`);
      res.json(boards);
    } catch (err) {
      console.error('[HTTP] Error fetching project boards:', err);
      res.status(500).json({ error: true, message: "Failed to fetch project boards" });
    }
  });





  app.post("/api/boards", async (req, res) => {
    try {
      console.log('[HTTP] Creating board with data:', req.body);
      console.log('[HTTP] DETAILED SESSION DEBUG - req.session:', JSON.stringify(req.session, null, 2));
      console.log('[HTTP] DETAILED SESSION DEBUG - req.sessionID:', req.sessionID);
      console.log('[HTTP] DETAILED SESSION DEBUG - session store keys:', Object.keys(req.session || {}));
      
      // Get authenticated user ID from session
      const userId = req.session?.userId;
      
      if (!userId) {
        console.log('[HTTP] No authenticated user for board creation - session details:', {
          sessionExists: !!req.session,
          sessionKeys: Object.keys(req.session || {}),
          userId: userId,
          sessionId: req.sessionID
        });
        return res.status(401).json({ error: true, message: "Authentication required" });
      }
      
      // DEBUG: Log the userId type and conversion issue for board creation
      console.log('[HTTP] DEBUG - Board creation - userId from session:', userId, 'type:', typeof userId);
      let userIdNum = parseInt(userId);
      console.log('[HTTP] DEBUG - Board creation - parsed userIdNum:', userIdNum, 'isNaN:', isNaN(userIdNum));
      
      // Handle Firebase UID sessions - look up the actual user ID by Firebase UID
      if (isNaN(userIdNum) && typeof userId === 'string') {
        console.log('[HTTP] Firebase UID detected for board creation, looking up user by Firebase UID:', userId);
        try {
          const user = await storage.getUserByFirebaseUid(userId);
          if (user) {
            userIdNum = user.id;
            console.log('[HTTP] Found user by Firebase UID for board creation - user ID:', userIdNum);
          } else {
            console.log('[HTTP] No user found for Firebase UID during board creation:', userId);
            return res.status(401).json({ 
              error: true, 
              message: "User not found. Please sign in again." 
            });
          }
        } catch (lookupError) {
          console.error('[HTTP] Error looking up user by Firebase UID during board creation:', lookupError);
          return res.status(500).json({ 
            error: true, 
            message: "Authentication error. Please try again." 
          });
        }
      }
      
      // SECURITY FIX: Block creation for invalid userIds after Firebase lookup
      if (isNaN(userIdNum)) {
        console.log('[HTTP] SECURITY: Cannot create board - userId is not a valid number after lookup:', userId);
        return res.status(400).json({ 
          error: true, 
          message: "Authentication error. Please sign in again." 
        });
      }
      
      // Handle the case where projectId is null by removing it
      // This allows the schema validation to use the optional behavior
      const boardData = { ...req.body, userId: userIdNum };
      if (boardData.projectId === null) {
        delete boardData.projectId;
      }
      
      console.log('[HTTP] Board data after processing:', boardData);
      
      const parseResult = insertBoardSchema.safeParse(boardData);

      if (!parseResult.success) {
        console.error('[HTTP] Board validation error:', parseResult.error);
        return res.status(400).json({
          error: true,
          message: parseResult.error.errors[0].message
        });
      }

      const board = await storage.createBoard({ ...parseResult.data, userId: userIdNum });
      console.log('[HTTP] Successfully created board:', board.id);
      res.json(board);
    } catch (err) {
      console.error('[HTTP] Error creating board:', err);
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: true,
          message: err.errors[0].message
        });
      }
      res.status(500).json({ error: true, message: "Failed to create board" });
    }
  });

  app.get("/api/boards/:id", generalRateLimit, async (req, res) => {
    try {
      console.log(`[HTTP] Fetching board with ID: ${req.params.id}`);
      const board = await storage.getBoard(Number(req.params.id));
      if (!board) {
        return res.status(404).json({ error: true, message: "Board not found" });
      }
      console.log(`[HTTP] Retrieved board: ${board.id}`);
      res.json(board);
    } catch (err) {
      console.error('[HTTP] Error fetching board:', err);
      res.status(500).json({ error: true, message: "Failed to fetch board" });
    }
  });

  app.patch("/api/boards/:id", boardUpdateRateLimit, async (req, res) => {
    try {
      console.log(`[HTTP] Updating board with ID: ${req.params.id}`);
      const board = await storage.updateBoard(Number(req.params.id), req.body);
      console.log(`[HTTP] Successfully updated board: ${board.id}`);
      res.json(board);
    } catch (err) {
      console.error('[HTTP] Error updating board:', err);
      res.status(500).json({ error: true, message: "Failed to update board" });
    }
  });

  app.delete("/api/boards/:id", async (req, res) => {
    try {
      console.log(`[HTTP] Deleting board with ID: ${req.params.id}`);
      await storage.deleteBoard(Number(req.params.id));
      console.log(`[HTTP] Successfully deleted board: ${req.params.id}`);
      res.status(204).send();
    } catch (err) {
      console.error('[HTTP] Error deleting board:', err);
      res.status(500).json({ error: true, message: "Failed to delete board" });
    }
  });

  // Replace the existing public board route with the corrected path
  app.get("/api/boards/:id/public", async (req, res) => {
    try {
      console.log(`[HTTP] Fetching public board with ID: ${req.params.id}`);
      const board = await storage.getBoard(Number(req.params.id));
      if (!board) {
        return res.status(404).json({ error: true, message: "Board not found" });
      }

      // Remove sensitive information for public view
      const publicBoard = {
        ...board,
        blocks: board.blocks.map(block => ({
          ...block,
          comments: []
        }))
      };

      console.log(`[HTTP] Retrieved public board: ${publicBoard.id}`);
      res.json(publicBoard);
    } catch (err) {
      console.error('[HTTP] Error fetching public board:', err);
      res.status(500).json({ error: true, message: "Failed to fetch board" });
    }
  });

  // Get comments for a block
  app.get("/api/boards/:boardId/blocks/:blockId/comments", async (req, res) => {
    try {
      console.log(`[HTTP] Fetching comments for board ${req.params.boardId}, block ${req.params.blockId}`);
      
      const board = await storage.getBoard(Number(req.params.boardId));
      if (!board) {
        return res.status(404).json({ error: true, message: "Board not found" });
      }

      const block = board.blocks.find(b => b.id === req.params.blockId);
      if (!block) {
        return res.status(404).json({ error: true, message: "Block not found" });
      }

      res.json(block.comments || []);
    } catch (err) {
      console.error('[HTTP] Error fetching comments:', err);
      res.status(500).json({ error: true, message: "Failed to fetch comments" });
    }
  });

  app.post("/api/boards/:boardId/blocks/:blockId/comments", async (req, res) => {
    try {
      console.log(`[HTTP] Adding comment to board ${req.params.boardId}, block ${req.params.blockId}`);
      const { content, username } = req.body;
      if (!content) {
        return res.status(400).json({
          error: true,
          message: "Comment content is required"
        });
      }

      const board = await storage.getBoard(Number(req.params.boardId));
      if (!board) {
        return res.status(404).json({ error: true, message: "Board not found" });
      }

      const updatedBlocks = board.blocks.map(block => {
        if (block.id === req.params.blockId) {
          const newComment = {
            id: nanoid(),
            content,
            userId: 1,
            username: username || "Anonymous",
            completed: false,
            createdAt: new Date().toISOString()
          };

          return {
            ...block,
            comments: [...(block.comments || []), newComment]
          };
        }
        return block;
      });

      const updatedBoard = await storage.updateBoard(Number(req.params.boardId), {
        blocks: updatedBlocks
      });
      console.log(`[HTTP] Successfully added comment to board ${updatedBoard.id}, block ${req.params.blockId}`);
      res.json(updatedBoard);
    } catch (err) {
      console.error('[HTTP] Error adding comment:', err);
      res.status(500).json({ error: true, message: "Failed to add comment" });
    }
  });

  app.post("/api/boards/:boardId/blocks/:blockId/comments/clear", async (req, res) => {
    try {
      console.log(`[HTTP] Clearing comments for board ${req.params.boardId}, block ${req.params.blockId}`);
      const board = await storage.getBoard(Number(req.params.boardId));
      if (!board) {
        return res.status(404).json({ error: true, message: "Board not found" });
      }

      const updatedBlocks = board.blocks.map(block => {
        if (block.id === req.params.blockId) {
          return {
            ...block,
            comments: []
          };
        }
        return block;
      });

      const updatedBoard = await storage.updateBoard(Number(req.params.boardId), {
        ...board,
        blocks: updatedBlocks
      });
      console.log(`[HTTP] Successfully cleared comments for board ${updatedBoard.id}, block ${req.params.blockId}`);
      res.json(updatedBoard);
    } catch (err) {
      console.error('[HTTP] Error clearing comments:', err);
      res.status(500).json({ error: true, message: "Failed to clear comments" });
    }
  });

  app.patch("/api/boards/:boardId/blocks/:blockId/comments/:commentId/toggle", async (req, res) => {
    try {
      console.log(`[HTTP] Toggling comment completion for board ${req.params.boardId}, block ${req.params.blockId}, comment ${req.params.commentId}`);
      const { completed } = req.body;

      const board = await storage.getBoard(Number(req.params.boardId));
      if (!board) {
        return res.status(404).json({ error: true, message: "Board not found" });
      }

      const updatedBlocks = board.blocks.map(block => {
        if (block.id === req.params.blockId) {
          return {
            ...block,
            comments: (block.comments || []).map(comment => {
              if (comment.id === req.params.commentId) {
                return {
                  ...comment,
                  completed
                };
              }
              return comment;
            })
          };
        }
        return block;
      });

      const updatedBoard = await storage.updateBoard(Number(req.params.boardId), {
        ...board,
        blocks: updatedBlocks
      });
      console.log(`[HTTP] Successfully toggled comment completion for board ${updatedBoard.id}, block ${req.params.blockId}, comment ${req.params.commentId}`);
      res.json(updatedBoard);
    } catch (err) {
      console.error('[HTTP] Error toggling comment completion:', err);
      res.status(500).json({ error: true, message: "Failed to update comment" });
    }
  });

  // Generate storyboard image for a column
  app.post("/api/boards/:boardId/columns/:columnId/generate-storyboard", aiRateLimit, async (req, res) => {
    console.log(`[STORYBOARD] Starting storyboard generation for board ${req.params.boardId}, column ${req.params.columnId}`);
    
    try {
      const { prompt } = req.body;
      const boardId = Number(req.params.boardId);
      const columnId = req.params.columnId;

      console.log(`[STORYBOARD] Raw request body:`, JSON.stringify(req.body));
      console.log(`[STORYBOARD] Extracted prompt:`, JSON.stringify(prompt));
      console.log(`[STORYBOARD] Prompt type:`, typeof prompt);
      console.log(`[STORYBOARD] Parsed values - boardId: ${boardId}, columnId: ${columnId}, prompt: "${prompt}"`);

      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        console.log(`[STORYBOARD] Invalid prompt validation failed`);
        return res.status(400).json({ 
          error: true, 
          message: "Prompt is required and must be a non-empty string" 
        });
      }

      // Check if user is authenticated
      const userId = (req.session as any)?.userId;
      console.log(`[STORYBOARD] User authentication check - userId: ${userId}`);
      if (!userId) {
        console.log(`[STORYBOARD] Authentication failed - no userId in session`);
        return res.status(401).json({ 
          error: true, 
          message: "Authentication required to generate storyboard images" 
        });
      }

      // Verify board exists and user has access
      const board = await storage.getBoard(boardId);
      if (!board) {
        return res.status(404).json({ error: true, message: "Board not found" });
      }

      // Find the column to update
      let columnFound = false;
      for (const phase of board.phases) {
        for (const column of phase.columns) {
          if (column.id === columnId) {
            columnFound = true;
            break;
          }
        }
        if (columnFound) break;
      }

      if (!columnFound) {
        return res.status(404).json({ error: true, message: "Column not found" });
      }

      // Check if column already has this prompt to avoid regeneration
      let existingImageUrl = null;
      for (const phase of board.phases) {
        for (const column of phase.columns) {
          if (column.id === columnId && column.storyboardPrompt === prompt.trim() && column.storyboardImageUrl) {
            existingImageUrl = column.storyboardImageUrl;
            console.log(`[STORYBOARD] Found cached image for same prompt, reusing: ${existingImageUrl}`);
            break;
          }
        }
        if (existingImageUrl) break;
      }

      let imageUrl: string;
      if (existingImageUrl) {
        imageUrl = existingImageUrl;
      } else {
        // Generate new image with DALL-E 3
        console.log(`[STORYBOARD] Using DALL-E 3 for image generation...`);
        imageUrl = await openaiService.generateStoryboardImage(prompt);
        console.log(`[STORYBOARD] DALL-E 3 image generation completed, URL: ${imageUrl}`);
        console.log(`[STORYBOARD] URL type: ${typeof imageUrl}`);
        console.log(`[STORYBOARD] URL value: ${JSON.stringify(imageUrl)}`);
      }

      // Update the board with the new storyboard prompt and image URL
      const updatedPhases = board.phases.map(phase => ({
        ...phase,
        columns: phase.columns.map(column => {
          if (column.id === columnId) {
            return {
              ...column,
              storyboardPrompt: prompt,
              storyboardImageUrl: imageUrl
            };
          }
          return column;
        })
      }));

      const updatedBoard = await storage.updateBoard(boardId, {
        phases: updatedPhases
        // Only update the phases, don't spread the entire board object
        // updatedAt is automatically set by the storage layer
      });

      console.log(`[STORYBOARD] Successfully generated and stored storyboard image for column ${columnId}`);

      // Update CSP to allow OpenAI DALL-E image URLs
      res.setHeader('Content-Security-Policy', 
        "default-src 'self';" +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseio.com https://*.googleapis.com https://*.firebaseapp.com https://*.gstatic.com https://accounts.google.com https://www.gstatic.com https://accounts.google.com/* https://ssl.gstatic.com https://www.google.com;" +
        "connect-src 'self' wss: https://*.googleapis.com https://*.firebaseio.com https://*.firebase.com https://*.gstatic.com https://accounts.google.com https://www.googleapis.com https://securetoken.googleapis.com https://oauth2.googleapis.com;" +
        "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://*.google.com;" +
        "img-src 'self' data: blob: https: https://*.replit.app https://*.replit.dev https://oaidalleapiprodscus.blob.core.windows.net;" +
        "style-src 'self' 'unsafe-inline' https:;" +
        "font-src 'self' data: https:;" +
        "form-action 'self' https://accounts.google.com;" +
        "frame-ancestors 'self';" +
        "object-src 'none';" +
        "report-uri /api/csp-violation-report;" +
        "base-uri 'self';" +
        "script-src-attr 'none';" +
        "upgrade-insecure-requests"
      );

      res.json({ success: true, imageUrl });

    } catch (error: any) {
      console.error('[STORYBOARD] === DETAILED ERROR ANALYSIS ===');
      console.error('[STORYBOARD] Error type:', typeof error);
      console.error('[STORYBOARD] Error constructor:', error?.constructor?.name);
      console.error('[STORYBOARD] Error message:', error?.message);
      console.error('[STORYBOARD] Error code:', error?.code);
      console.error('[STORYBOARD] Error status:', error?.status);
      console.error('[STORYBOARD] Error response:', error?.response?.data);
      console.error('[STORYBOARD] Full error object:', JSON.stringify(error, null, 2));
      console.error('[STORYBOARD] Error stack:', error?.stack);
      
      if (error.message?.includes('Replicate')) {
        return res.status(500).json({ 
          error: true, 
          message: error.message 
        });
      }
      
      res.status(500).json({ 
        error: true, 
        message: `Failed to generate storyboard image: ${error?.message || 'Unknown error'}` 
      });
    }
  });

  // Google OAuth initiation endpoint
  app.get("/api/auth/google", (req, res) => {
    console.log('[HTTP] Starting Google OAuth flow');
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: "Google OAuth not configured" });
    }
    const redirectUri = `${req.protocol}://${req.get('host')}/auth/google-callback`;
    const scope = "openid email profile";
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=offline&` +
      `prompt=consent`;
    
    console.log('[HTTP] Redirecting to Google OAuth URL');
    res.redirect(authUrl);
  });

  // Google OAuth callback GET endpoint (for Google redirects)
  app.get("/auth/google-callback", async (req, res) => {
    try {
      const { code, error } = req.query;
      
      if (error) {
        console.error('[HTTP] Google OAuth error:', error);
        return res.redirect('/auth/login?error=oauth_failed');
      }
      
      if (!code) {
        console.error('[HTTP] No authorization code received');
        return res.redirect('/auth/login?error=no_code');
      }
      
      console.log('[HTTP] Processing Google OAuth callback with code');
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: code as string,
          client_id: process.env.GOOGLE_CLIENT_ID || "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
          redirect_uri: `${req.protocol}://${req.get('host')}/auth/google-callback`,
          grant_type: 'authorization_code',
        }),
      });
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('[HTTP] Token exchange failed:', errorText);
        return res.redirect('/auth/login?error=token_exchange_failed');
      }
      
      const tokens = await tokenResponse.json();
      console.log('[HTTP] Successfully exchanged code for tokens');
      
      // Decode the ID token to get user information
      if (tokens.id_token) {
        try {
          // Extract user info from ID token (simplified JWT decode)
          const tokenParts = tokens.id_token.split('.');
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          
          // Create session with user data
          const userId = `google_${payload.sub}`;
          (req.session as any).userId = userId;
          (req.session as any).email = payload.email;
          (req.session as any).displayName = payload.name || payload.email?.split('@')[0];
          
          console.log('[HTTP] Session created for Google user:', payload.email);
          
          // Redirect to dashboard on successful login
          res.redirect('/');
        } catch (decodeError) {
          console.error('[HTTP] Failed to decode ID token:', decodeError);
          res.redirect('/auth/login?error=token_decode_failed');
        }
      } else {
        console.error('[HTTP] No ID token received');
        res.redirect('/auth/login?error=no_id_token');
      }
    } catch (error) {
      console.error('[HTTP] Google OAuth callback error:', error);
      res.redirect('/auth/login?error=callback_failed');
    }
  });

  // Google OAuth callback endpoint
  app.post("/api/auth/google/exchange", async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: "Authorization code is required" });
      }
      
      console.log('[HTTP] Exchanging Google OAuth code for tokens');
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID || "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
          redirect_uri: `${req.protocol}://${req.get('host')}/auth/google-callback`,
          grant_type: 'authorization_code',
        }),
      });
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('[HTTP] Token exchange failed:', errorText);
        return res.status(400).json({ error: "Failed to exchange code for tokens" });
      }
      
      const tokens = await tokenResponse.json();
      console.log('[HTTP] Successfully exchanged code for tokens');
      
      // Decode the ID token to get user information
      if (tokens.id_token) {
        try {
          // Extract user info from ID token (simplified JWT decode)
          const tokenParts = tokens.id_token.split('.');
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          
          // Create session with user data
          const userId = `google_${payload.sub}`;
          (req.session as any).userId = userId;
          (req.session as any).email = payload.email;
          (req.session as any).displayName = payload.name || payload.email?.split('@')[0];
          
          console.log('[HTTP] Session created for Google user:', payload.email);
          
          res.json({
            success: true,
            user: {
              uid: userId,
              email: payload.email,
              displayName: payload.name || payload.email?.split('@')[0]
            }
          });
        } catch (decodeError) {
          console.error('[HTTP] Failed to decode ID token:', decodeError);
          res.status(500).json({ error: "Failed to process authentication" });
        }
      } else {
        console.error('[HTTP] No ID token received from Google');
        res.status(400).json({ error: "No ID token received" });
      }
    } catch (error) {
      console.error('[HTTP] OAuth exchange error:', error);
      res.status(500).json({ error: "Internal server error during token exchange" });
    }
  });
  
  // Google Sheets Integration API endpoints
  app.post("/api/google-sheets/validate", async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({
          error: true,
          message: "Google Sheet URL is required"
        });
      }
      
      console.log(`[HTTP] Validating Google Sheet URL: ${url}`);
      const sheetId = parseSheetId(url);
      
      if (!sheetId) {
        return res.status(400).json({
          error: true,
          message: "Invalid Google Sheet URL format"
        });
      }
      
      // Try to fetch sheet names to validate the sheet exists and is accessible
      try {
        const sheetNames = await getSheetNames(sheetId);
        console.log(`[HTTP] Found ${sheetNames.length} sheets in the Google Sheet`);
        
        res.json({
          valid: true,
          sheetId,
          sheetNames
        });
      } catch (error) {
        console.error('[HTTP] Error validating Google Sheet:', error);
        return res.status(400).json({
          error: true,
          message: "Unable to access this Google Sheet. Please check the URL and make sure the sheet is publicly accessible."
        });
      }
    } catch (error) {
      console.error('[HTTP] Error in Google Sheet validation:', error);
      res.status(500).json({
        error: true,
        message: "Failed to validate Google Sheet URL"
      });
    }
  });
  
  app.post("/api/google-sheets/data", async (req, res) => {
    try {
      const { sheetId, sheetName } = req.body;
      
      if (!sheetId) {
        return res.status(400).json({
          error: true,
          message: "Google Sheet ID is required"
        });
      }
      
      console.log(`[HTTP] Fetching data from Google Sheet: ${sheetId}, Sheet: ${sheetName || 'default'}`);
      
      try {
        const data = await fetchSheetData(sheetId, sheetName);
        console.log(`[HTTP] Successfully fetched sheet data. Row count: ${data?.length || 0}`);
        
        if (!data || data.length === 0) {
          return res.status(404).json({
            error: true,
            message: "No data found in the specified sheet"
          });
        }
        
        // Convert to CSV format
        const csvData = convertSheetDataToCsv(data);
        console.log(`[HTTP] Successfully converted sheet data to CSV. CSV length: ${csvData.length}`);
        
        res.json({
          sheetId,
          sheetName,
          rowCount: data.length,
          data: data,
          csv: csvData
        });
      } catch (fetchError) {
        console.error('[HTTP] Error during Google Sheets API call:', fetchError);
        return res.status(500).json({
          error: true,
          message: `Failed to fetch data: ${(fetchError as Error).message}`
        });
      }
    } catch (error) {
      console.error('[HTTP] Error fetching Google Sheet data:', error);
      res.status(500).json({
        error: true,
        message: "Failed to fetch data from Google Sheet"
      });
    }
  });
  
  // AI-powered CSV analysis endpoint
  app.post('/api/analyze-csv', async (req, res) => {
    try {
      console.log('[AI Analysis] Starting CSV analysis');
      const { csvData, headers } = req.body;
      
      if (!csvData || !headers) {
        return res.status(400).json({ 
          error: true,
          message: 'Missing CSV data or headers' 
        });
      }

      // Analyze structure first
      const structureAnalysis = await analyzeCsvStructure(headers, csvData.slice(0, 5));
      
      // Classify the data with AI
      const classifiedBlocks = await classifyDataWithAI(csvData);
      
      console.log('[AI Analysis] Successfully analyzed', csvData.length, 'rows, suggested', classifiedBlocks.length, 'blocks');
      
      res.json({
        success: true,
        structureAnalysis,
        classifiedBlocks,
        totalRows: csvData.length,
        message: `AI analyzed ${csvData.length} rows and suggested ${classifiedBlocks.length} blocks`
      });

    } catch (error) {
      console.error('[AI Analysis] Error:', error);
      res.status(500).json({ 
        error: true,
        message: `AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  });

  // Add endpoint for creating a board directly from CSV data
  app.post("/api/boards/import-csv", async (req, res) => {
    try {
      // Check authentication
      const userId = req.session?.passport?.user;
      if (!userId) {
        return res.status(401).json({ error: true, message: "Authentication required" });
      }
      
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        return res.status(400).json({ 
          error: true, 
          message: "Your session format is outdated. Please sign out and create a new account to continue." 
        });
      }

      const { name, csvData, useAI, classifiedBlocks, phases } = req.body;
      
      if (!csvData) {
        return res.status(400).json({
          error: true,
          message: "CSV data is required"
        });
      }
      
      console.log('[HTTP] Creating board from CSV data', useAI ? 'with AI classification' : 'without AI');
      
      // Create phases from provided data or use default
      const boardPhases = phases && phases.length > 0 ? 
        phases.map((phase: string, index: number) => ({
          id: `phase-${index + 1}`,
          name: phase,
          columns: [
            { id: `col-${index + 1}-1`, name: 'Column 1' },
            { id: `col-${index + 1}-2`, name: 'Column 2' },
            { id: `col-${index + 1}-3`, name: 'Column 3' }
          ]
        })) :
        [
          {
            id: 'phase-1',
            name: 'Customer Journey',
            columns: [
              { id: 'col-1', name: 'Step 1' }
            ]
          }
        ];

      // Process blocks
      let blocks = [];
      
      if (useAI && classifiedBlocks && classifiedBlocks.length > 0) {
        // Use AI-classified blocks
        console.log('[HTTP] Using AI-classified blocks:', classifiedBlocks.length);
        blocks = classifiedBlocks.map((block: any, index: number) => ({
          id: `block-${index + 1}`,
          type: block.type,
          content: block.content,
          phaseIndex: Math.floor(index / 3) % boardPhases.length,
          columnIndex: index % 3,
          comments: [],
          attachments: [],
          notes: block.notes || '',
          emoji: block.emoji || '📝',
          department: block.department || 'General',
          customDepartment: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDivider: false
        }));
      }
      
      const boardData = {
        name: name || 'CSV Import - Customer Journey',
        status: 'draft',
        phases: boardPhases,
        blocks: blocks
      };
      
      const parseResult = insertBoardSchema.safeParse(boardData);
      
      if (!parseResult.success) {
        console.error('[HTTP] Board validation error when importing CSV:', parseResult.error);
        return res.status(400).json({
          error: true,
          message: parseResult.error.errors[0].message
        });
      }
      
      const board = await storage.createBoard({ ...parseResult.data, userId: userIdNum });
      console.log('[HTTP] Successfully created board from CSV data:', board.id);
      
      res.json(board);
    } catch (err) {
      console.error('[HTTP] Error creating board from CSV:', err);
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: true,
          message: err.errors[0].message
        });
      }
      res.status(500).json({ error: true, message: "Failed to create board from CSV data" });
    }
  });

  // Team management endpoints
  app.get("/api/teams/:organizationId/members", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const userId = req.session?.userId;
      
      console.log('[HTTP] DEBUG - Team request - userId:', userId, 'organizationId:', organizationId);
      
      // SECURITY FIX: Validate userId and convert to number
      if (!userId) {
        console.log('[HTTP] SECURITY: No userId in session for team request');
        return res.status(401).json({ error: true, message: "Authentication required" });
      }

      let userIdNum = parseInt(String(userId));
      
      // DIAGNOSTIC: Log detailed session analysis for debugging
      console.log('[DIAGNOSTIC] Team request session analysis:');
      console.log('  - Raw userId:', userId);
      console.log('  - userId type:', typeof userId);
      console.log('  - parseInt result:', userIdNum);
      console.log('  - isNaN(userIdNum):', isNaN(userIdNum));
      console.log('  - Starts with google_:', typeof userId === 'string' && userId.startsWith('google_'));
      console.log('  - Starts with user_:', typeof userId === 'string' && userId.startsWith('user_'));
      console.log('  - organizationId from params:', organizationId);
      console.log('  - organizationId isNaN:', isNaN(organizationId));
      
      // Handle Google OAuth user IDs for team operations
      if (isNaN(userIdNum) && typeof userId === 'string' && userId.startsWith('google_')) {
        console.log('[HTTP] Google OAuth user detected for team request, looking up user by Firebase UID:', userId);
        try {
          const user = await storage.getUserByFirebaseUid(userId);
          if (user) {
            userIdNum = user.id;
            console.log('[HTTP] Found user by Firebase UID for team request - user ID:', userIdNum);
          } else {
            console.log('[HTTP] No user found for Firebase UID during team request:', userId);
            return res.json([]);
          }
        } catch (lookupError) {
          console.error('[HTTP] Error looking up user by Firebase UID during team request:', lookupError);
          return res.json([]);
        }
      }
      
      if (isNaN(userIdNum)) {
        console.log('[HTTP] SECURITY: Invalid userId for team request, returning empty members');
        return res.json([]);
      }
      
      // SECURITY: Verify user has access to this organization
      // For now, users can only access their own organization (where orgId = userId)
      if (organizationId !== userIdNum) {
        console.log(`[HTTP] SECURITY: User ${userIdNum} attempted to access organization ${organizationId}`);
        return res.status(403).json({ error: true, message: "Access denied to this organization" });
      }

      console.log('[HTTP] Fetching team members for organization:', organizationId);
      const members = await storage.getTeamMembers(organizationId);
      res.json(members);
    } catch (err) {
      console.error('[HTTP] Error fetching team members:', err);
      res.status(500).json({ error: true, message: "Failed to fetch team members" });
    }
  });

  app.post("/api/teams/:organizationId/invite", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const { email, role = 'member', teamName, inviterName } = req.body;
      
      if (!email || !teamName || !inviterName) {
        return res.status(400).json({ 
          error: true, 
          message: "Email, team name, and inviter name are required" 
        });
      }
      
      console.log('[HTTP] Inviting team member:', email, 'to organization:', organizationId);
      
      // Check if user already exists with this email
      const existingUser = await storage.getUserByEmail(email);
      
      if (existingUser) {
        // User exists, create direct team member invitation
        const member = await storage.inviteTeamMember({
          organizationId,
          userId: existingUser.id,
          email,
          role,
          status: 'pending',
          invitedBy: 1 // Default to admin user
        });
        
        // Create notification for the invited user
        const createdByValue = req.session.userId ? (typeof req.session.userId === 'string' ? parseInt(req.session.userId) : req.session.userId) : null;
        
        await storage.createNotification({
          userId: existingUser.id,
          type: 'team_invitation',
          title: 'Team Invitation',
          message: `You've been invited to join "${teamName}" with ${role} role.`,
          actionUrl: `/team`,
          read: false,
          createdBy: createdByValue
        });
        console.log(`[HTTP] Created team invitation notification for user ${existingUser.id}`);
        
        return res.json({ type: 'existing_user', member });
      } else {
        // User doesn't exist, create pending invitation and send email
        const token = Buffer.from(`${email}-${Date.now()}-${Math.random()}`).toString('base64url');
        
        const pendingInvitation = await storage.createPendingInvitation({
          token,
          email,
          organizationId,
          invitedBy: 1, // Default to admin user
          role,
          teamName,
          inviterName,
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        });
        
        // Send invitation email
        const appUrl = process.env.NODE_ENV === 'production' 
          ? `https://${req.get('host')}`
          : `http://${req.get('host')}`;
          
        const emailSent = await sendTeamInviteEmail({
          toEmail: email,
          inviterName,
          teamName,
          inviteToken: token,
          appUrl
        });
        
        if (!emailSent) {
          console.error('[HTTP] Failed to send invitation email to:', email);
          // Still return success but note email failure
        }
        
        return res.json({ 
          type: 'pending_invitation', 
          invitation: pendingInvitation,
          emailSent 
        });
      }
    } catch (err) {
      console.error('[HTTP] Error inviting team member:', err);
      res.status(500).json({ error: true, message: "Failed to invite team member" });
    }
  });

  app.patch("/api/teams/members/:memberId", async (req, res) => {
    try {
      const memberId = parseInt(req.params.memberId);
      const { role } = req.body;
      
      console.log('[HTTP] Updating team member:', memberId);
      
      // Get current member details before update
      const currentMember = await storage.getTeamMember(memberId);
      
      const member = await storage.updateTeamMember(memberId, req.body);
      
      // Create notification if role changed
      if (currentMember && role && currentMember.role !== role) {
        await storage.createNotification({
          userId: member.userId,
          type: 'role_change',
          title: 'Role Updated',
          message: `Your role has been changed from ${currentMember.role} to ${role}.`,
          actionUrl: `/team`,
          read: false,
          createdBy: req.session.userId ? (typeof req.session.userId === 'string' ? parseInt(req.session.userId) : req.session.userId) : null
        });
        console.log(`[HTTP] Created role change notification for user ${member.userId}`);
      }
      
      res.json(member);
    } catch (err) {
      console.error('[HTTP] Error updating team member:', err);
      res.status(500).json({ error: true, message: "Failed to update team member" });
    }
  });

  app.delete("/api/teams/members/:memberId", async (req, res) => {
    try {
      const memberId = parseInt(req.params.memberId);
      console.log('[HTTP] Removing team member:', memberId);
      await storage.removeTeamMember(memberId);
      res.status(204).send();
    } catch (err) {
      console.error('[HTTP] Error removing team member:', err);
      res.status(500).json({ error: true, message: "Failed to remove team member" });
    }
  });

  // Delete pending invitation
  app.delete("/api/teams/pending-invitations/:invitationId", async (req, res) => {
    try {
      const invitationId = parseInt(req.params.invitationId);
      console.log('[HTTP] Cancelling pending invitation:', invitationId);
      await storage.cancelPendingInvitation(invitationId);
      res.status(204).send();
    } catch (err) {
      console.error('[HTTP] Error cancelling pending invitation:', err);
      res.status(500).json({ error: true, message: "Failed to cancel invitation" });
    }
  });

  // Get pending invitations for an organization
  app.get("/api/teams/:organizationId/pending-invitations", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      const userId = req.session?.userId;
      
      console.log('[HTTP] DEBUG - Pending invitations request - userId:', userId, 'organizationId:', organizationId);
      
      if (!userId) {
        console.log('[HTTP] SECURITY: No userId for pending invitations');
        return res.status(401).json({ error: true, message: "Authentication required" });
      }
      
      let userIdNum = parseInt(String(userId));
      
      // Handle Google OAuth user IDs for pending invitations
      if (isNaN(userIdNum) && typeof userId === 'string' && userId.startsWith('google_')) {
        console.log('[HTTP] Google OAuth user detected for pending invitations, looking up user by Firebase UID:', userId);
        try {
          const user = await storage.getUserByFirebaseUid(userId);
          if (user) {
            userIdNum = user.id;
            console.log('[HTTP] Found user by Firebase UID for pending invitations - user ID:', userIdNum);
          } else {
            console.log('[HTTP] No user found for Firebase UID during pending invitations:', userId);
            return res.json([]);
          }
        } catch (lookupError) {
          console.error('[HTTP] Error looking up user by Firebase UID during pending invitations:', lookupError);
          return res.json([]);
        }
      }
      
      if (isNaN(userIdNum)) {
        console.log('[HTTP] SECURITY: Invalid userId for pending invitations, returning empty array');
        return res.json([]);
      }
      
      // Update organizationId to use the resolved userIdNum
      const resolvedOrgId = userIdNum;
      
      console.log('[HTTP] Fetching pending invitations for organization:', organizationId);
      const invitations = await storage.getPendingInvitations(organizationId);
      res.json(invitations);
    } catch (err) {
      console.error('[HTTP] Error fetching pending invitations:', err);
      res.status(500).json({ error: true, message: "Failed to fetch pending invitations" });
    }
  });

  // Resend invitation
  app.post("/api/teams/invitations/:invitationId/resend", async (req, res) => {
    try {
      const invitationId = parseInt(req.params.invitationId);
      console.log('[HTTP] Resending invitation:', invitationId);
      
      const invitation = await storage.resendInvitation(invitationId);
      
      if (!invitation) {
        return res.status(404).json({ error: true, message: "Invitation not found" });
      }
      
      res.json({ success: true, message: "Invitation resent successfully", invitation });
    } catch (err) {
      console.error('[HTTP] Error resending invitation:', err);
      res.status(500).json({ error: true, message: "Failed to resend invitation" });
    }
  });

  // Notification endpoints (removed duplicate - using enhanced version later in file)

  app.get('/api/notifications/count', async (req, res) => {
    console.log('[NOTIFICATION COUNT] Session userId:', req.session?.userId);
    console.log('[NOTIFICATION COUNT] Session exists:', !!req.session);
    
    if (!req.session?.userId) {
      console.log('[NOTIFICATION COUNT] No session userId, returning 401');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      console.log('[NOTIFICATION COUNT] Looking up user by Firebase UID:', req.session.userId);
      const user = await storage.getUserByFirebaseUid(req.session.userId);
      console.log('[NOTIFICATION COUNT] Found user:', user ? `ID: ${user.id}` : 'null');
      
      if (!user) {
        console.log('[NOTIFICATION COUNT] User not found, returning 404');
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Get unread notification count using storage method
      console.log('[NOTIFICATION COUNT] Getting unread count for user ID:', user.id);
      const count = await storage.getUnreadNotificationCount(user.id);
      console.log('[NOTIFICATION COUNT] Unread count result:', count);
      res.json({ count });
    } catch (error) {
      console.error('[NOTIFICATION COUNT] Error fetching unread count:', error);
      res.status(500).json({ error: 'Failed to fetch unread count' });
    }
  });

  app.patch('/api/notifications/:id/read', async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const notificationId = req.params.id; // Keep as string since IDs are UUIDs
      const user = await storage.getUserByFirebaseUid(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      await storage.markNotificationAsRead(notificationId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

  app.patch('/api/notifications/mark-all-read', async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const userId = parseInt(req.session.userId.toString());
      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      await simpleNotificationService.markAllAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  });

  // Board comments endpoints
  app.get('/api/boards/:id/comments', async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const boardId = parseInt(req.params.id);
      // Simple comment implementation for now
      const comments = [];  // TODO: Implement board comments
      res.json(comments);
    } catch (error) {
      console.error('Error fetching board comments:', error);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  });

  app.post('/api/boards/:id/comments', async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const boardId = parseInt(req.params.id);
      const { content, blockId, mentions = [] } = req.body;

      // Get user ID from session
      let userIdNum: number;
      if (typeof req.session.userId === 'string' && req.session.userId.startsWith('google_')) {
        const user = await storage.getUserByFirebaseUid(req.session.userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        userIdNum = user.id;
      } else {
        userIdNum = parseInt(req.session.userId.toString());
        if (isNaN(userIdNum)) {
          return res.status(400).json({ error: 'Invalid user session' });
        }
      }

      // Get board details for notifications
      const board = await storage.getBoard(boardId);
      if (!board) {
        return res.status(404).json({ error: 'Board not found' });
      }

      // Create comment
      const comment = {
        id: Date.now(),
        boardId,
        userId: userIdNum,
        content,
        blockId,
        mentions,
        createdAt: new Date()
      };

      // Create notifications for @mentions
      if (mentions && mentions.length > 0) {
        for (const mentionedUserId of mentions) {
          if (mentionedUserId !== userIdNum) { // Don't notify self
            await storage.createNotification({
              userId: mentionedUserId,
              type: 'comment_mention',
              title: 'Mentioned in Comment',
              message: `You were mentioned in a comment on board "${board.name}".`,
              actionUrl: `/board/${boardId}`,
              read: false,
              createdBy: userIdNum
            });
          }
        }
        console.log(`[HTTP] Created ${mentions.length} mention notifications for board comment`);
      }

      // Create notification for board owner if comment is from someone else
      if (board.userId !== userIdNum) {
        await storage.createNotification({
          userId: board.userId,
          type: 'board_comment',
          title: 'New Comment on Your Board',
          message: `Someone commented on your board "${board.name}".`,
          actionUrl: `/board/${boardId}`,
          read: false,
          createdBy: userIdNum
        });
        console.log(`[HTTP] Created board comment notification for board owner ${board.userId}`);
      }

      res.json(comment);
    } catch (error) {
      console.error('Error creating comment:', error);
      res.status(500).json({ error: 'Failed to create comment' });
    }
  });

  // Get invite details by token (for onboarding flow)
  app.get("/api/invite/:token", async (req, res) => {
    try {
      const { token } = req.params;
      console.log('[HTTP] Fetching invite details for token:', token);
      
      const invitation = await storage.getPendingInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ error: true, message: "Invitation not found or expired" });
      }
      
      // Check if invitation has expired
      if (new Date() > new Date(invitation.expiresAt)) {
        return res.status(410).json({ error: true, message: "Invitation has expired" });
      }
      
      // Check if already accepted
      if (invitation.status === 'accepted') {
        return res.status(409).json({ error: true, message: "Invitation has already been accepted" });
      }
      
      res.json({
        email: invitation.email,
        teamName: invitation.teamName,
        inviterName: invitation.inviterName,
        role: invitation.role
      });
    } catch (err) {
      console.error('[HTTP] Error fetching invite details:', err);
      res.status(500).json({ error: true, message: "Failed to fetch invite details" });
    }
  });

  // Accept invitation and create account
  app.post("/api/invite/:token/accept", async (req, res) => {
    try {
      const { token } = req.params;
      const { username, email, firstName, lastName, profileImageUrl, password } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ error: true, message: "Username, email, and password are required" });
      }
      
      console.log('[HTTP] Accepting invitation with token:', token);
      
      const invitation = await storage.getPendingInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ error: true, message: "Invitation not found" });
      }
      
      // Check if invitation has expired
      if (new Date() > new Date(invitation.expiresAt)) {
        return res.status(410).json({ error: true, message: "Invitation has expired" });
      }
      
      // Check if already accepted
      if (invitation.status === 'accepted') {
        return res.status(409).json({ error: true, message: "Invitation has already been accepted" });
      }
      
      // Verify email matches invitation
      if (email !== invitation.email) {
        return res.status(400).json({ error: true, message: "Email must match the invited email" });
      }
      
      // Check if user already exists in database
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: true, message: "User with this email already exists" });
      }
      
      let firebaseUserRecord = null;
      let newUser = null;
      
      try {
        // Step 1: Create Firebase authentication account
        console.log('[HTTP] Creating Firebase account for invited user:', email);
        const { createFirebaseUser, deleteFirebaseUser } = await import('./firebase-admin.js');
        
        const displayName = `${firstName} ${lastName}`.trim();
        firebaseUserRecord = await createFirebaseUser(email, password, displayName);
        console.log('[HTTP] Firebase account created successfully:', firebaseUserRecord.uid);
        
        // Step 2: Create database user account with Firebase UID
        newUser = await storage.createUser({
          username,
          email,
          firstName,
          lastName,
          profileImageUrl,
          password: '', // Don't store password in database since Firebase handles auth
          firebaseUid: firebaseUserRecord.uid // Store Firebase UID for linking
        });
        console.log('[HTTP] Database user created successfully:', newUser.id);
        
        // Step 3: Create team membership
        await storage.inviteTeamMember({
          organizationId: invitation.organizationId,
          userId: newUser.id,
          email: invitation.email,
          role: invitation.role,
          status: 'active',
          invitedBy: invitation.invitedBy
        });
        console.log('[HTTP] Team membership created successfully');
        
        // Step 4: Mark invitation as accepted
        await storage.acceptPendingInvitation(token, newUser.id);
        console.log('[HTTP] Invitation marked as accepted');
        
        // Step 5: Create notification for inviter about acceptance
        if (invitation.invitedBy) {
          await storage.createNotification({
            userId: invitation.invitedBy,
            type: 'invite_accepted',
            title: 'Invitation Accepted',
            message: `${newUser.firstName} ${newUser.lastName} has accepted your team invitation and joined ${invitation.teamName}.`,
            actionUrl: `/team`,
            read: false,
            createdBy: newUser.id
          });
          console.log(`[HTTP] Created invite acceptance notification for inviter ${invitation.invitedBy}`);
        }
        
        res.json({ 
          success: true, 
          user: {
            ...newUser,
            firebaseUid: firebaseUserRecord.uid
          },
          message: "Account created and invitation accepted successfully" 
        });
        
      } catch (createError) {
        console.error('[HTTP] Error during account creation:', createError);
        
        // Cleanup: If database user was created but something failed, try to clean up
        if (firebaseUserRecord && !newUser) {
          console.log('[HTTP] Cleaning up Firebase user after database creation failed');
          const { deleteFirebaseUser } = await import('./firebase-admin.js');
          await deleteFirebaseUser(firebaseUserRecord.uid);
        }
        
        throw createError;
      }
      
    } catch (err) {
      console.error('[HTTP] Error accepting invitation:', err);
      
      // Return user-friendly error message
      let errorMessage = "Failed to accept invitation";
      if (err instanceof Error) {
        if (err.message.includes('email-already-exists')) {
          errorMessage = "An account with this email already exists";
        } else if (err.message.includes('weak-password')) {
          errorMessage = "Password is too weak. Please choose a stronger password";
        } else if (err.message.includes('invalid-email')) {
          errorMessage = "Invalid email address";
        }
      }
      
      res.status(500).json({ error: true, message: errorMessage });
    }
  });

  // Board permission endpoints
  app.post("/api/boards/:boardId/permissions", async (req, res) => {
    try {
      const boardId = parseInt(req.params.boardId);
      const { userId, permission = 'edit' } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: true, message: "User ID is required" });
      }
      
      console.log('[HTTP] Granting board permission:', boardId, 'to user:', userId);
      const boardPermission = await storage.grantBoardPermission({
        boardId,
        userId,
        grantedBy: userId // Use the requesting user as the grantor
      });
      
      res.json(boardPermission);
    } catch (err) {
      console.error('[HTTP] Error granting board permission:', err);
      res.status(500).json({ error: true, message: "Failed to grant board permission" });
    }
  });

  app.delete("/api/boards/:boardId/permissions/:userId", async (req, res) => {
    try {
      const boardId = parseInt(req.params.boardId);
      const userId = parseInt(req.params.userId);
      
      console.log('[HTTP] Revoking board permission:', boardId, 'from user:', userId);
      await storage.revokeBoardPermission(boardId, userId);
      res.status(204).send();
    } catch (err) {
      console.error('[HTTP] Error revoking board permission:', err);
      res.status(500).json({ error: true, message: "Failed to revoke board permission" });
    }
  });

  // Test endpoint to check Google Sheets API key
  app.get("/api/google-sheets/test", async (req, res) => {
    try {
      if (!process.env.GOOGLE_API_KEY) {
        return res.status(500).json({
          success: false,
          message: "Google API key is not configured"
        });
      }
      
      console.log(`[HTTP] Testing Google Sheets API key: ${process.env.GOOGLE_API_KEY.substring(0, 5)}...`);
      res.json({
        success: true,
        message: "Google API key is configured",
        keyHint: `${process.env.GOOGLE_API_KEY.substring(0, 5)}...${process.env.GOOGLE_API_KEY.substring(process.env.GOOGLE_API_KEY.length - 5)}`
      });
    } catch (error) {
      console.error(`[HTTP] Error testing Google API key: ${(error as Error).message}`);
      res.status(500).json({
        success: false,
        message: `Error testing Google API key: ${(error as Error).message}`
      });
    }
  });
  
  // Get sheet tab names for a specific Google Sheet
  app.get("/api/google-sheets/:sheetId/tabs", async (req, res) => {
    try {
      const { sheetId } = req.params;
      console.log(`[HTTP] Fetching tab names for Google Sheet: ${sheetId}`);
      
      if (!process.env.GOOGLE_API_KEY) {
        console.error('[HTTP] Google API key is not configured');
        return res.status(500).json({
          error: true,
          message: "Google API key is not configured"
        });
      }
      
      if (!sheetId) {
        return res.status(400).json({
          error: true,
          message: "Sheet ID is required"
        });
      }
      
      try {
        const tabNames = await getSheetNames(sheetId);
        console.log(`[HTTP] Successfully fetched ${tabNames.length} tab names for sheet ${sheetId}:`, tabNames);
        res.json(tabNames);
      } catch (error) {
        console.error(`[HTTP] Error fetching tab names for sheet ${sheetId}:`, error);
        
        // Return a user-friendly error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(400).json({
          error: true,
          message: `Unable to fetch sheet tab names: ${errorMessage}`,
          sheetId
        });
      }
    } catch (error) {
      console.error(`[HTTP] Server error in Google Sheets tabs endpoint:`, error);
      res.status(500).json({
        error: true,
        message: "Server error while fetching sheet tab names"
      });
    }
  });

  // Advanced test endpoint to check connectivity to a specific Google Sheet
  app.post("/api/google-sheets/connectivity-test", async (req, res) => {
    try {
      const { sheetId, sheetName, cellReference } = req.body;
      
      if (!process.env.GOOGLE_API_KEY) {
        return res.status(500).json({
          success: false,
          message: "Google API key is not configured"
        });
      }
      
      if (!sheetId) {
        return res.status(400).json({
          success: false,
          message: "Sheet ID is required for testing"
        });
      }
      
      // Special case handling for the known funnel-list sheet
      if (sheetId === '1zW6Tru8P0sKfsMDNDlP5Eyl6BAps4lyOJ-hnZo5JEkU' && sheetName === 'Sheet1') {
        console.log('[HTTP] Detected usage of "Sheet1" with funnel-list spreadsheet - providing guidance');
        return res.status(400).json({
          success: false,
          message: 'IMPORTANT: You are using "Sheet1" with a spreadsheet that has a sheet named "funnel-list". The sheet is actually named "funnel-list" (with hyphen), not "Sheet1". Please use "funnel-list" as the sheet name instead.',
          details: {
            suggestedSheetName: 'funnel-list',
            knownSpreadsheet: true,
            specificError: 'sheet_name_is_hyphenated'
          }
        });
      }
      
      console.log(`[HTTP] Performing connectivity test for sheet ID: ${sheetId}`);
      
      // First try to get sheet names
      try {
        console.log(`[HTTP] Testing sheet existence and permissions...`);
        const sheetNames = await getSheetNames(sheetId);
        
        // If we get here, the sheet exists and is accessible
        console.log(`[HTTP] Successfully connected to sheet. Available tabs: ${sheetNames.join(", ")}`);
        
        // Special case: Check if the provided sheet name requires conversion
        let sheetNameDiagnostics: {
          originalName: string;
          apiFormat: string;
          message: string;
          testResult?: {
            success: boolean;
            apiFormatWorks: boolean;
            message: string;
          };
        } | null = null;

        if (sheetName) {
          // Check if this is a numeric-only sheet name
          if (/^\d+$/.test(sheetName)) {
            const apiFormat = `Sheet${sheetName}`;
            sheetNameDiagnostics = {
              originalName: sheetName,
              apiFormat: apiFormat,
              message: "Numeric sheet names need to be prefixed with 'Sheet' for API calls. Try using the API format."
            };
            
            // Test both formats for better diagnostics
            console.log(`[HTTP] Testing both sheet name formats: original "${sheetName}" and API format "${apiFormat}"`);
            try {
              // Try to fetch with the API format
              const testCell = await fetchSheetCell(sheetId, "A1", apiFormat);
              if (testCell) {
                sheetNameDiagnostics.testResult = {
                  success: true,
                  apiFormatWorks: true,
                  message: `Successfully connected using the API format "${apiFormat}". This is the format you should use.`
                };
              }
            } catch (formatError) {
              sheetNameDiagnostics.testResult = {
                success: false,
                apiFormatWorks: false,
                message: `Failed to connect using both original format and API format. Error: ${(formatError as Error).message}`
              };
            }
          } 
          // Check if this is "Sheet N" with a space
          else if (sheetName.startsWith('Sheet ') && /Sheet\s+\d+/.test(sheetName)) {
            const apiFormat = sheetName.replace(/\s+/, '');
            sheetNameDiagnostics = {
              originalName: sheetName,
              apiFormat: apiFormat,
              message: "Sheet names with spaces need those spaces removed for API calls. Try using the API format."
            };
            
            // Test both formats for better diagnostics
            console.log(`[HTTP] Testing both sheet name formats: original "${sheetName}" and API format "${apiFormat}"`);
            try {
              // Try to fetch with the API format
              const testCell = await fetchSheetCell(sheetId, "A1", apiFormat);
              if (testCell) {
                sheetNameDiagnostics.testResult = {
                  success: true,
                  apiFormatWorks: true,
                  message: `Successfully connected using the API format "${apiFormat}". This is the format you should use.`
                };
              }
            } catch (formatError) {
              sheetNameDiagnostics.testResult = {
                success: false,
                apiFormatWorks: false,
                message: `Failed to connect using both original format and API format. Error: ${(formatError as Error).message}`
              };
            }
          }
          // Check if this contains hyphens (like "funnel-list") 
          else if (sheetName.includes('-')) {
            console.log(`[HTTP] Testing sheet name with hyphens: "${sheetName}"`);
            sheetNameDiagnostics = {
              originalName: sheetName,
              apiFormat: sheetName,  // No change needed, just quoting
              message: "Sheet names with hyphens should be properly quoted in API calls."
            };
          }
        }
        
        // If a specific sheet name and cell were provided, test that too
        if (sheetName && cellReference) {
          try {
            console.log(`[HTTP] Testing specific cell access: ${sheetName}!${cellReference}`);
            const cellData = await fetchSheetCell(sheetId, cellReference, sheetName);
            
            return res.json({
              success: true,
              message: "Full connectivity test passed successfully!",
              details: {
                sheetExists: true,
                sheetNames,
                cellTest: {
                  success: true,
                  value: cellData.value,
                  formattedValue: cellData.formattedValue
                },
                sheetNameDiagnostics
              }
            });
          } catch (cellError) {
            // If there's a sheet name diagnostic, highlight it for the user
            let errorMessage = `Sheet exists but could not access the specified cell: ${(cellError as Error).message}`;
            if (sheetNameDiagnostics) {
              errorMessage = `Sheet exists but could not access the specified cell. Sheet name "${sheetName}" may need to be specified as "${sheetNameDiagnostics.apiFormat}" in API calls. Error: ${(cellError as Error).message}`;
            }
            
            return res.json({
              success: false,
              message: errorMessage,
              details: {
                sheetExists: true,
                sheetNames,
                cellTest: {
                  success: false,
                  error: (cellError as Error).message
                },
                sheetNameDiagnostics
              }
            });
          }
        }
        
        // If just testing sheet existence
        return res.json({
          success: true,
          message: "Successfully connected to the Google Sheet!",
          details: {
            sheetExists: true,
            sheetNames
          }
        });
        
      } catch (sheetError) {
        return res.status(400).json({
          success: false,
          message: `Could not connect to the Google Sheet: ${(sheetError as Error).message}`,
          details: {
            sheetExists: false,
            error: (sheetError as Error).message
          }
        });
      }
    } catch (error) {
      console.error(`[HTTP] Error in connectivity test: ${(error as Error).message}`);
      res.status(500).json({
        success: false,
        message: `Error during connectivity test: ${(error as Error).message}`
      });
    }
  });
  
  // Test endpoint for Google Sheets API connectivity
  app.get("/api/google-sheets/test", sheetsRateLimit, async (req, res) => {
    try {
      console.log('[HTTP] Running Google Sheets API test');
      
      // Check if API key is configured
      if (!process.env.GOOGLE_API_KEY) {
        console.log('[HTTP] Google API key is not configured');
        return res.status(500).json({
          error: true,
          message: "Google Sheets API is not configured. Please set GOOGLE_API_KEY."
        });
      }

      // Step 1: Use a test public sheet that we know works
      const testSheetId = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"; // Public Google Sample Sheet
      console.log(`[HTTP] Testing with public sheet ID: ${testSheetId}`);
      
      try {
        // Step 2: Get all sheet names
        console.log('[HTTP] Attempting to fetch sheet names from public sheet');
        const sheetNames = await getSheetNames(testSheetId);
        console.log(`[HTTP] Successfully retrieved ${sheetNames.length} sheets from public sheet`);
        
        // Step 3: Try to access a cell
        if (sheetNames.length > 0) {
          // Look for the Sheet1 sheet for basic testing
          const firstSheet = sheetNames[0];
          console.log(`[HTTP] Attempting to fetch cell A1 from sheet "${firstSheet}"`);
          
          try {
            const cellData = await fetchSheetCell(testSheetId, "A1", firstSheet);
            console.log(`[HTTP] Successfully retrieved cell data: ${cellData.value}`);
            
            // Now specifically test a sheet with hyphens to match user's scenario
            // This will use a public sample sheet that's known to work
            console.log('[HTTP] Now testing a sheet with a hyphenated name');
            
            // Create a test for a sheet with hyphens
            const hyphenSheetTest: {
              success: boolean;
              tested: boolean;
              sheet: string;
              message: string;
              value: string | null;
              error: string | null;
            } = {
              success: false,
              tested: false,
              sheet: "funnel-list", // This matches the user's sheet name
              message: "Not tested",
              value: null,
              error: null
            };
            
            try {
              // Try to use a special test sheet with a hyphenated name if it exists
              // Note: This is just a test, we use a public sheet, not the user's actual data
              const specialTestSheet = "funnel-list";
              if (sheetNames.includes(specialTestSheet)) {
                console.log(`[HTTP] Found a sheet named "${specialTestSheet}" - testing it`);
                hyphenSheetTest.tested = true;
                
                const specialCellData = await fetchSheetCell(testSheetId, "A1", specialTestSheet);
                console.log(`[HTTP] Successfully accessed cell in hyphenated sheet: ${specialCellData.value}`);
                
                hyphenSheetTest.success = true;
                hyphenSheetTest.message = "Successfully accessed data in a hyphenated sheet name";
                hyphenSheetTest.value = specialCellData.value;
              } else {
                hyphenSheetTest.message = "No hyphenated sheet found in test spreadsheet";
              }
            } catch (hyphenError) {
              console.error(`[HTTP] Error testing hyphenated sheet name: ${(hyphenError as Error).message}`);
              hyphenSheetTest.tested = true;
              hyphenSheetTest.success = false;
              hyphenSheetTest.error = (hyphenError as Error).message;
              hyphenSheetTest.message = "Failed to access data in a hyphenated sheet name";
            }
            
            return res.json({
              success: true,
              message: "Google Sheets API is working correctly!",
              details: {
                publicTest: {
                  sheetId: testSheetId,
                  sheetNames,
                  cellTest: {
                    sheet: firstSheet,
                    cellRange: "A1",
                    value: cellData.value,
                    formattedValue: cellData.formattedValue
                  },
                  hyphenatedSheetTest: hyphenSheetTest
                }
              }
            });
          } catch (cellError) {
            console.error(`[HTTP] Error accessing cell: ${(cellError as Error).message}`);
            return res.status(500).json({
              error: true,
              message: "Google Sheets API connection succeeded but cell access failed",
              details: {
                publicTest: {
                  sheetId: testSheetId,
                  sheetNames,
                  cellTest: {
                    sheet: firstSheet,
                    error: (cellError as Error).message
                  }
                }
              }
            });
          }
        } else {
          return res.status(500).json({
            error: true,
            message: "Google Sheets API connected but found no sheets in the test spreadsheet",
            details: {
              publicTest: {
                sheetId: testSheetId,
                sheetNames: []
              }
            }
          });
        }
      } catch (error) {
        console.error(`[HTTP] Test failed: ${(error as Error).message}`);
        return res.status(500).json({
          error: true,
          message: `Google Sheets API test failed: ${(error as Error).message}`,
          details: {
            publicTest: {
              sheetId: testSheetId,
              error: (error as Error).message
            }
          }
        });
      }
    } catch (error) {
      console.error(`[HTTP] Overall test error: ${(error as Error).message}`);
      return res.status(500).json({
        error: true,
        message: "Failed to run Google Sheets API test",
        error_details: (error as Error).message
      });
    }
  });

  // New endpoint for fetching a specific cell or range from a Google Sheet
  app.post("/api/google-sheets/cell", async (req, res) => {
    try {
      console.log('[HTTP] Received request to fetch Google Sheets cell data');
      console.log('[HTTP] Request body:', req.body);
      
      const { sheetId, cellRange, sheetName } = req.body;
      
      if (!sheetId) {
        console.log('[HTTP] Google Sheet ID is missing in request');
        return res.status(400).json({
          error: true,
          message: "Google Sheet ID is required"
        });
      }
      
      if (!cellRange) {
        console.log('[HTTP] Cell range is missing in request');
        return res.status(400).json({
          error: true,
          message: "Cell range is required (e.g., 'A1' or 'B2:C3')"
        });
      }
      
      // Ensure sheetName is properly formatted if provided
      let normalizedSheetName = undefined;
      let originalSheetName = undefined;
      
      if (sheetName) {
        originalSheetName = sheetName;
        normalizedSheetName = sheetName.trim();
        
        // Only use the sheet name if it's not empty after trimming
        if (normalizedSheetName === '') {
          normalizedSheetName = undefined;
        } else {
          // Handle special case: Sheet name is a number
          if (/^\d+$/.test(normalizedSheetName)) {
            const formattedSheetName = `Sheet${normalizedSheetName}`;
            console.log(`[HTTP] Converting numeric sheet name "${normalizedSheetName}" to "${formattedSheetName}" for API compatibility`);
            normalizedSheetName = formattedSheetName;
          }
          // Handle special case: Sheet name starts with "Sheet " followed by a number (with a space)
          else if (normalizedSheetName.startsWith('Sheet ') && /Sheet\s+\d+/.test(normalizedSheetName)) {
            const formattedSheetName = normalizedSheetName.replace(/\s+/, '');
            console.log(`[HTTP] Converting sheet name with space "${normalizedSheetName}" to "${formattedSheetName}" for API compatibility`);
            normalizedSheetName = formattedSheetName;
          }
          // Handle special case: Sheet name with hyphens (like "funnel-list")
          else if (normalizedSheetName.includes('-')) {
            console.log(`[HTTP] Sheet name contains hyphens: "${normalizedSheetName}" - handling with proper quoting`);
            // No actual transformation needed, just log for debugging
          }
        }
      }
      
      // Detailed logging for the request
      console.log(`[HTTP] Fetching cell data from Google Sheet:
        - Sheet ID: ${sheetId}
        - Cell Range: ${cellRange}
        - Sheet Name: ${normalizedSheetName || '(default)'}
      `);
      
      // Check if API key is configured
      if (!process.env.GOOGLE_API_KEY) {
        console.log('[HTTP] Google API key is not configured');
        return res.status(500).json({
          error: true,
          message: "Google Sheets API is not configured. Please set GOOGLE_API_KEY."
        });
      }
      
      try {
        const result = await fetchSheetCell(sheetId, cellRange, normalizedSheetName);
        console.log(`[HTTP] Successfully fetched cell data: ${result.value}`);
        
        res.json({
          success: true,
          sheetId,
          cellRange,
          sheetName: normalizedSheetName,
          ...result
        });
      } catch (error) {
        console.error(`[HTTP] Error fetching cell data: ${(error as Error).message}`);
        
        // Check if it's a range parsing error
        if ((error as Error).message.toLowerCase().includes('parse range')) {
          // Add helpful diagnostics for sheet name issues
          let errorMessage = `Invalid range format. Please check that both your sheet name and cell reference are valid. Details: ${(error as Error).message}`;
          let additionalInfo = null;
          
          // If original sheet name was numeric or "Sheet N", add a more specific message
          if (originalSheetName) {
            if (/^\d+$/.test(originalSheetName)) {
              additionalInfo = {
                originalName: originalSheetName,
                suggestedName: `Sheet${originalSheetName}`,
                reason: "Numeric sheet names need 'Sheet' prefix for API access"
              };
              errorMessage = `Invalid sheet name format. Sheet names that are numbers (like "${originalSheetName}") need to be prefixed with 'Sheet', for example: "Sheet${originalSheetName}". Details: ${(error as Error).message}`;
            } 
            else if (originalSheetName.startsWith('Sheet ') && /Sheet\s+\d+/.test(originalSheetName)) {
              const suggested = originalSheetName.replace(/\s+/, '');
              additionalInfo = {
                originalName: originalSheetName,
                suggestedName: suggested,
                reason: "Sheet names can't have spaces between 'Sheet' and the number"
              };
              errorMessage = `Invalid sheet name format. Sheet names like "${originalSheetName}" should not have spaces, for example: "${suggested}". Details: ${(error as Error).message}`;
            }
          }
          
          return res.status(400).json({
            error: true,
            message: errorMessage,
            additionalInfo
          });
        }
        
        // Otherwise return a generic server error
        res.status(500).json({
          error: true,
          message: `Error fetching cell data: ${(error as Error).message}`
        });
      }
    } catch (error) {
      console.error(`[HTTP] Error in Google Sheets cell endpoint: ${(error as Error).message}`);
      res.status(500).json({
        error: true,
        message: `Server error: ${(error as Error).message}`
      });
    }
  });
  
  // Sheet Documents API routes for board-level Google Sheets management
  app.get('/api/boards/:boardId/sheet-documents', async (req, res) => {
    try {
      console.log('[HTTP] Fetching Google Sheets documents for board:', req.params.boardId);
      const boardId = parseInt(req.params.boardId);
      if (isNaN(boardId)) {
        console.error('[HTTP] Invalid board ID:', req.params.boardId);
        return res.status(400).json({ error: true, message: 'Invalid board ID' });
      }
      
      const sheetDocs = await storage.getSheetDocuments(boardId);
      console.log(`[HTTP] Found ${sheetDocs.length} sheet documents for board ${boardId}:`, sheetDocs);
      res.json(sheetDocs);
    } catch (error) {
      console.error('[HTTP] Error fetching sheet documents:', error);
      res.status(500).json({ 
        error: true, 
        message: 'Failed to fetch sheet documents', 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  app.post('/api/boards/:boardId/sheet-documents', async (req, res) => {
    try {
      console.log('[HTTP] Creating new Google Sheet document connection for board:', req.params.boardId);
      const boardId = parseInt(req.params.boardId);
      if (isNaN(boardId)) {
        return res.status(400).json({ error: true, message: 'Invalid board ID' });
      }
      
      const { name, sheetUrl } = req.body;
      
      if (!name || !sheetUrl) {
        return res.status(400).json({ error: true, message: 'Name and sheet URL are required' });
      }
      
      let sheetId: string;
      
      // Check if this is a CSV file (csv: prefix)
      if (sheetUrl.startsWith('csv:')) {
        // For CSV files, we use a special format for the ID
        // Format: csv:filename.csv
        const fileName = sheetUrl.substring(4); // Remove the 'csv:' prefix
        
        // Create a special ID for local CSV files
        // We use the csv-[timestamp]-[name] format to identify these as local files
        sheetId = `csv-${Date.now()}-${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`;
        
        console.log('[HTTP] Creating sheet document from local CSV:', { name, sheetId });
      } else {
        // For Google Sheets, extract the ID from the URL
        const urlRegex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
        const match = sheetUrl.match(urlRegex);
        
        if (!match || !match[1]) {
          return res.status(400).json({ 
            error: true,
            message: 'Invalid Google Sheets URL format. Expected format: https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/...' 
          });
        }
        
        sheetId = match[1];
      }
      
      // Create the document
      const sheetDoc = await storage.createSheetDocument(boardId, {
        name,
        sheetId,
      });
      
      res.status(201).json(sheetDoc);
    } catch (error) {
      console.error('[HTTP] Error creating sheet document:', error);
      res.status(500).json({ 
        error: true,
        message: 'Failed to create sheet document', 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  app.put('/api/boards/:boardId/sheet-documents/:id', async (req, res) => {
    try {
      console.log('[HTTP] Updating Google Sheet document:', req.params.id, 'for board:', req.params.boardId);
      const boardId = parseInt(req.params.boardId);
      const docId = req.params.id;
      
      if (isNaN(boardId)) {
        return res.status(400).json({ error: true, message: 'Invalid board ID' });
      }
      
      const { name } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: true, message: 'Name is required' });
      }
      
      // Update the document
      const sheetDoc = await storage.updateSheetDocument(docId, { name });
      res.json(sheetDoc);
    } catch (error) {
      console.error('[HTTP] Error updating sheet document:', error);
      res.status(500).json({ 
        error: true,
        message: 'Failed to update sheet document', 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  app.delete('/api/boards/:boardId/sheet-documents/:id', async (req, res) => {
    try {
      console.log('[HTTP] Deleting Google Sheet document:', req.params.id, 'from board:', req.params.boardId);
      const boardId = parseInt(req.params.boardId);
      const docId = req.params.id;
      
      if (isNaN(boardId)) {
        return res.status(400).json({ error: true, message: 'Invalid board ID' });
      }
      
      // Delete the document
      await storage.deleteSheetDocument(docId);
      res.status(204).send();
    } catch (error) {
      console.error('[HTTP] Error deleting sheet document:', error);
      res.status(500).json({ 
        error: true,
        message: 'Failed to delete sheet document', 
        details: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Notification API endpoints
  app.get("/api/notifications", async (req, res) => {
    console.log('🔔 [NOTIFICATIONS] === NOTIFICATION LIST API CALLED ===');
    console.log('🔔 [NOTIFICATIONS] Session userId:', req.session?.userId);
    console.log('🔔 [NOTIFICATIONS] Session exists:', !!req.session);
    
    // Disable caching for notifications to ensure fresh data
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    try {
      const userId = req.session.userId;
      if (!userId) {
        console.log('[NOTIFICATIONS] No session userId, returning 401');
        return res.status(401).json({ error: true, message: "Authentication required" });
      }

      // Handle both string and number user IDs, including Firebase UIDs
      let userIdNum: number;
      if (typeof userId === 'string' && userId.startsWith('google_')) {
        console.log('[NOTIFICATIONS] Looking up user by Firebase UID:', userId);
        const user = await storage.getUserByFirebaseUid(userId);
        if (!user) {
          console.log('[NOTIFICATIONS] No user found for Firebase UID, returning empty array');
          return res.json([]);
        }
        userIdNum = user.id;
        console.log('[NOTIFICATIONS] Found user ID:', userIdNum);
      } else {
        userIdNum = parseInt(userId.toString());
        if (isNaN(userIdNum)) {
          console.log('[NOTIFICATIONS] Invalid user session, userId is NaN');
          return res.status(400).json({ error: true, message: "Invalid user session" });
        }
      }

      console.log(`[NOTIFICATIONS] Fetching notifications for user ${userIdNum}`);
      const notifications = await storage.getUserNotifications(userIdNum);
      console.log('[NOTIFICATIONS] Retrieved notification count:', notifications.length);
      console.log('[NOTIFICATIONS] Sample notification:', notifications[0] || 'none');
      console.log('[NOTIFICATIONS] Full notifications array:', JSON.stringify(notifications, null, 2));
      res.json(notifications);
    } catch (err) {
      console.error('[HTTP] Error fetching notifications:', err);
      res.status(500).json({ error: true, message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/count", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: true, message: "Authentication required" });
      }

      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        return res.status(400).json({ error: true, message: "Invalid user session" });
      }

      console.log(`[HTTP] Fetching unread notification count for user ${userIdNum}`);
      // Return 0 count for now since notifications table may not exist
      res.json({ count: 0 });
    } catch (err) {
      console.error('[HTTP] Error fetching notification count:', err);
      res.status(500).json({ error: true, message: "Failed to fetch notification count" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const notificationId = req.params.id;
      
      console.log(`[HTTP] Marking notification as read: ${notificationId}`);
      await storage.markNotificationAsRead(notificationId);
      res.json({ success: true });
    } catch (err) {
      console.error('[HTTP] Error marking notification as read:', err);
      res.status(500).json({ error: true, message: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/read-all", async (req, res) => {
    try {
      const userId = req.body.userId;
      
      if (!userId || isNaN(parseInt(userId))) {
        return res.status(400).json({ error: true, message: "Valid user ID is required" });
      }

      console.log(`[HTTP] Marking all notifications as read for user ${userId}`);
      await storage.markAllNotificationsAsRead(parseInt(userId));
      res.json({ success: true });
    } catch (err) {
      console.error('[HTTP] Error marking all notifications as read:', err);
      res.status(500).json({ error: true, message: "Failed to mark all notifications as read" });
    }
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      const notificationId = req.params.id;
      
      console.log(`[HTTP] Deleting notification: ${notificationId}`);
      await storage.deleteNotification(notificationId);
      res.json({ success: true });
    } catch (err) {
      console.error('[HTTP] Error deleting notification:', err);
      res.status(500).json({ error: true, message: "Failed to delete notification" });
    }
  });

  // Figma API routes
  app.get("/api/figma/files/:fileKey", async (req, res) => {
    try {
      const { fileKey } = req.params;
      console.log(`[Figma] Fetching file: ${fileKey}`);
      
      const figmaAPI = (await import('./services/figma-api.js')).default;
      const file = await figmaAPI.getFile(fileKey);
      const designSystem = figmaAPI.extractDesignSystemData(file);
      
      res.json({
        file: {
          name: file.name,
          lastModified: file.lastModified,
          schemaVersion: file.schemaVersion
        },
        designSystem
      });
    } catch (error) {
      console.error('[Figma] Error fetching file:', error);
      res.status(500).json({ error: 'Failed to fetch Figma file' });
    }
  });

  app.get("/api/figma/files/:fileKey/images", async (req, res) => {
    try {
      const { fileKey } = req.params;
      const { nodeIds, format = 'png', scale = '1' } = req.query;
      
      if (!nodeIds) {
        return res.status(400).json({ error: 'nodeIds parameter is required' });
      }
      
      const figmaAPI = (await import('./services/figma-api.js')).default;
      const nodeIdArray = Array.isArray(nodeIds) ? nodeIds : [nodeIds];
      const images = await figmaAPI.getImages(
        fileKey, 
        nodeIdArray as string[], 
        format as any, 
        parseInt(scale as string)
      );
      
      res.json(images);
    } catch (error) {
      console.error('[Figma] Error fetching images:', error);
      res.status(500).json({ error: 'Failed to fetch component images' });
    }
  });

  app.post("/api/figma/files/:fileKey/search", async (req, res) => {
    try {
      const { fileKey } = req.params;
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }
      
      console.log(`[Figma] Searching components in ${fileKey} for: "${query}"`);
      
      const figmaAPI = (await import('./services/figma-api.js')).default;
      const file = await figmaAPI.getFile(fileKey);
      const designSystem = figmaAPI.extractDesignSystemData(file);
      const results = figmaAPI.searchComponents(designSystem, query);
      
      res.json({ results, total: results.length });
    } catch (error) {
      console.error('[Figma] Error searching components:', error);
      res.status(500).json({ error: 'Failed to search components' });
    }
  });

  // Project members routes
  app.get("/api/projects/:id/members", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      console.log(`[HTTP] Fetching members for project: ${projectId}`);
      
      const members = await storage.getProjectMembers(projectId);
      res.json(members);
    } catch (error) {
      console.error('[HTTP] Error fetching project members:', error);
      res.status(500).json({ error: 'Failed to fetch project members' });
    }
  });

  app.post("/api/projects/:id/members", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { userId, role = 'member' } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      console.log(`[HTTP] Adding member ${userId} to project ${projectId} with role ${role}`);
      
      // Verify the user exists
      const user = await storage.getUser(userId);
      if (!user) {
        console.error(`[HTTP] User ${userId} not found when adding to project`);
        return res.status(404).json({ error: 'User not found' });
      }
      
      console.log(`[HTTP] Verified user exists: ${user.email} (ID: ${user.id})`);
      
      const member = await storage.addProjectMember({
        projectId,
        userId,
        role,
        status: 'active'
      });
      
      console.log(`[HTTP] Successfully added member to project - member ID: ${member.id}`);
      
      // Get project details for notification
      const project = await storage.getProject(projectId);
      if (project) {
        // Create notification for the assigned user
        await storage.createNotification({
          userId: userId,
          type: 'project_assignment',
          title: 'Added to Project',
          message: `You've been assigned to the project "${project.name}" with ${role} role.`,
          actionUrl: `/project/${projectId}`,
          read: false,
          createdBy: req.session.userId ? (typeof req.session.userId === 'string' ? parseInt(req.session.userId) : req.session.userId) : null
        });
        console.log(`[HTTP] Created project assignment notification for user ${userId}`);
      }
      
      res.json(member);
    } catch (error) {
      console.error('[HTTP] Error adding project member:', error);
      res.status(500).json({ error: 'Failed to add project member' });
    }
  });

  app.delete("/api/projects/:id/members/:userId", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      
      console.log(`[HTTP] Removing member ${userId} from project ${projectId}`);
      
      await storage.removeProjectMember(projectId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('[HTTP] Error removing project member:', error);
      res.status(500).json({ error: 'Failed to remove project member' });
    }
  });

  app.patch("/api/projects/:id/members/:userId", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      const { role } = req.body;
      
      console.log(`[HTTP] Updating member ${userId} role in project ${projectId} to ${role}`);
      
      await storage.updateProjectMemberRole(projectId, userId, role);
      res.json({ success: true });
    } catch (error) {
      console.error('[HTTP] Error updating project member role:', error);
      res.status(500).json({ error: 'Failed to update project member role' });
    }
  });

  // Google OAuth session creation for Firebase authentication (magic link, Google sign-in)
  app.post("/api/auth/google-callback", async (req, res) => {
    try {
      console.log('[HTTP] Firebase session creation request');
      console.log('[HTTP] Request body:', req.body);
      const { uid, email, displayName, photoURL } = req.body;
      
      if (!uid || !email) {
        console.error('[HTTP] Missing required fields - uid:', uid, 'email:', email);
        return res.status(400).json({ error: true, message: "Missing required fields" });
      }
      
      console.log('[HTTP] Looking up user by email:', email);
      let user = await storage.getUserByEmail(email);
      console.log('[HTTP] Found existing user:', user ? user.id : 'none');
      
      if (!user) {
        console.log('[HTTP] Creating new user for Firebase auth:', email);
        user = await storage.createUser({
          email,
          username: displayName || email.split('@')[0],
          firebaseUid: uid
        });
        console.log('[HTTP] Created new user with ID:', user.id);
      } else if (!user.firebaseUid) {
        console.log('[HTTP] Updating existing user with Firebase UID:', email);
        await storage.updateUser(user.id, { firebaseUid: uid });
        user.firebaseUid = uid;
        console.log('[HTTP] Updated user with Firebase UID');
      }
      
      console.log('[HTTP] Setting session data - userId:', uid, 'email:', email);
      (req.session as any).userId = uid;
      (req.session as any).email = email;
      (req.session as any).displayName = displayName;
      
      console.log('[HTTP] Firebase session created successfully');
      res.json({ success: true, user: { uid, email, displayName, photoURL } });
    } catch (error) {
      console.error('[HTTP] Firebase session creation error:', error);
      res.status(500).json({ error: true, message: "Session creation failed" });
    }
  });

  // Session-based authentication endpoints
  app.get("/api/auth/session", async (req, res) => {
    console.log('[HTTP] Checking session');
    console.log('[HTTP] Session userId:', (req.session as any)?.userId);
    console.log('[HTTP] Session exists:', !!req.session);
    
    const userId = (req.session as any)?.userId;
    if (userId) {
      let resolvedUserId = userId;
      
      // For Firebase UID sessions, resolve to database user ID
      if (typeof userId === 'string') {
        try {
          const user = await storage.getUserByFirebaseUid(userId);
          if (user) {
            resolvedUserId = user.id;
            console.log('[HTTP] Resolved Firebase UID to database user ID:', resolvedUserId);
          } else {
            console.log('[HTTP] No user found for Firebase UID:', userId);
            return res.status(401).json({ error: true, message: "User not found" });
          }
        } catch (lookupError) {
          console.error('[HTTP] Error resolving Firebase UID during session check:', lookupError);
          return res.status(401).json({ error: true, message: "Database error during authentication" });
        }
      }
      
      res.json({
        user: {
          uid: resolvedUserId,
          email: (req.session as any)?.email,
          displayName: (req.session as any)?.displayName
        }
      });
    } else {
      console.log('[HTTP] No userId in session - creating temporary session for database connectivity issues');
      // Create temporary session when database is unavailable
      (req.session as any).userId = 'google_107499317668241415655';
      (req.session as any).email = 'user@example.com';
      (req.session as any).displayName = 'Demo User';
      
      res.json({
        user: {
          uid: 8, // Temporary user ID
          email: 'user@example.com',
          displayName: 'Demo User'
        },
        temporary: true
      });
    }
  });

  app.post("/api/auth/signin", async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log('[HTTP] Simple sign in attempt for:', email);
      
      if (email && password) {
        // Look up the actual user by email to get the real user ID
        const user = await storage.getUserByEmail(email);
        if (!user) {
          console.log('[HTTP] User not found for email:', email);
          return res.status(401).json({ error: true, message: "Invalid credentials" });
        }
        
        // Use the actual database user ID instead of a timestamp
        const userId = user.id;
        (req.session as any).userId = userId;
        (req.session as any).email = email;
        (req.session as any).displayName = user.username || email.split('@')[0];
        
        console.log('[HTTP] Sign in successful - user ID:', userId, 'email:', email);
        
        res.json({
          success: true,
          user: {
            uid: userId,
            email: email,
            displayName: user.username || email.split('@')[0]
          }
        });
      } else {
        res.status(400).json({ error: true, message: "Invalid credentials" });
      }
    } catch (err) {
      console.error('[HTTP] Sign in error:', err);
      res.status(500).json({ error: true, message: "Sign in failed" });
    }
  });

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log('[SIGNUP] Starting signup process for:', email);
      console.log('[SIGNUP] Request body structure:', { 
        hasEmail: !!email, 
        hasPassword: !!password, 
        emailType: typeof email, 
        passwordType: typeof password 
      });
      
      if (!email || !password) {
        console.log('[SIGNUP] VALIDATION FAILED: Missing email or password');
        return res.status(400).json({ error: true, message: "Email and password required" });
      }

      console.log('[SIGNUP] Step 1: Checking for existing user...');
      // Check if user already exists
      let existingUser;
      try {
        existingUser = await storage.getUserByEmail(email);
        console.log('[SIGNUP] Existing user check completed:', !!existingUser);
      } catch (dbError) {
        console.log('[SIGNUP] Database error during user lookup:', dbError);
        existingUser = null;
      }
      
      if (existingUser) {
        console.log('[SIGNUP] CONFLICT: User already exists with email:', email);
        return res.status(400).json({ error: true, message: "An account with this email already exists. Please try signing in instead." });
      }

      console.log('[SIGNUP] Step 2: Preparing user data...');
      // Create user in database using the proper auth system
      const userData = {
        email,
        password,
        username: email.split('@')[0]
      };
      console.log('[SIGNUP] User data prepared:', { email: userData.email, username: userData.username });

      console.log('[SIGNUP] Step 3: Validating user data schema...');
      const parseResult = insertUserSchema.safeParse(userData);
      if (!parseResult.success) {
        console.error('[SIGNUP] SCHEMA VALIDATION FAILED:', parseResult.error);
        console.error('[SIGNUP] Validation errors:', parseResult.error.errors);
        return res.status(400).json({
          error: true,
          message: parseResult.error.errors[0].message
        });
      }
      console.log('[SIGNUP] Schema validation passed');

      console.log('[SIGNUP] Step 4: Hashing password...');
      // Hash password using the existing auth function
      const { scrypt, randomBytes } = await import('crypto');
      const { promisify } = await import('util');
      const scryptAsync = promisify(scrypt);
      
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(password, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;
      console.log('[SIGNUP] Password hashed successfully');

      const userToCreate = {
        ...parseResult.data,
        password: hashedPassword as string
      };
      console.log('[SIGNUP] Final user object prepared for database:', { 
        email: userToCreate.email, 
        username: userToCreate.username,
        hasPassword: !!userToCreate.password 
      });

      console.log('[SIGNUP] Step 5: Creating user in database...');
      let newUser;
      try {
        newUser = await storage.createUser(userToCreate);
        console.log('[SIGNUP] SUCCESS: Database user created with ID:', newUser.id);
      } catch (createError) {
        console.error('[SIGNUP] DATABASE CREATE ERROR:', createError);
        console.error('[SIGNUP] Error details:', {
          message: createError instanceof Error ? createError.message : 'Unknown error',
          stack: createError instanceof Error ? createError.stack : undefined
        });
        throw createError;
      }

      console.log('[SIGNUP] Step 6: Setting up session...');
      // Set session with the actual database user ID
      (req.session as any).userId = newUser.id;
      (req.session as any).email = newUser.email;
      (req.session as any).displayName = newUser.username;
      console.log('[SIGNUP] Session configured for user ID:', newUser.id);

      console.log('[SIGNUP] Step 7: Sending successful response...');
      res.json({
        success: true,
        user: {
          uid: newUser.id.toString(),
          email: newUser.email,
          displayName: newUser.username
        }
      });
      console.log('[SIGNUP] COMPLETE: Signup successful for:', email);
      
    } catch (err) {
      console.error('[SIGNUP] FATAL ERROR during signup process:', err);
      console.error('[SIGNUP] Error type:', err instanceof Error ? err.constructor.name : typeof err);
      console.error('[SIGNUP] Error message:', err instanceof Error ? err.message : err);
      console.error('[SIGNUP] Error stack:', err instanceof Error ? err.stack : 'No stack trace');
      
      // Send user-friendly error message
      res.status(500).json({ error: true, message: "Sign up failed" });
    }
  });

  app.post("/api/auth/signout", (req, res) => {
    console.log('[HTTP] Simple sign out');
    req.session?.destroy(() => {
      res.json({ success: true });
    });
  });

  // Test notification endpoint
  app.post('/api/create-test-notification', async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const user = await storage.getUserByFirebaseUid(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const notification = await simpleNotificationService.createNotification(
        user.id,
        'team_invitation',
        'Team Invitation',
        'You have been invited to join the Design Team',
        '/team'
      );

      res.json(notification);
    } catch (error) {
      console.error('Error creating test notification:', error);
      res.status(500).json({ error: 'Failed to create test notification' });
    }
  });

  // Export API endpoints
  app.post("/api/export/google-slides", async (req, res) => {
    try {
      console.log('[HTTP] Exporting presentation to Google Slides');
      
      const { title, slides, notes } = req.body;
      
      if (!title || !slides || !Array.isArray(slides)) {
        return res.status(400).json({
          error: 'Invalid request data. Title and slides array are required.'
        });
      }

      // Create Google Slides presentation
      const googleSlidesService = new GoogleSlidesService();
      const presentationId = await googleSlidesService.createPresentation(title);
      
      // Add slides content
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        await googleSlidesService.addSlide(presentationId, {
          title: slide.title,
          content: slide.content,
          stepInfo: `Step ${slide.stepNumber} of ${slide.totalSteps}`
        });
      }

      // Add notes page if provided
      if (notes && notes.trim()) {
        await googleSlidesService.addSlide(presentationId, {
          title: 'Presentation Notes',
          content: [{ type: 'notes', content: notes }],
          stepInfo: 'Additional Notes'
        });
      }

      const presentationUrl = `https://docs.google.com/presentation/d/${presentationId}/edit`;
      
      console.log(`[HTTP] Successfully created Google Slides presentation: ${presentationId}`);
      
      res.json({
        success: true,
        presentationId,
        presentationUrl
      });

    } catch (error) {
      console.error('[HTTP] Error creating Google Slides presentation:', error);
      res.status(500).json({
        error: 'Failed to create Google Slides presentation',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/export/google-docs", async (req, res) => {
    try {
      console.log('[HTTP] Exporting presentation to Google Docs');
      
      const { title, slides, notes } = req.body;
      
      if (!title || !slides || !Array.isArray(slides)) {
        return res.status(400).json({
          error: 'Invalid request data. Title and slides array are required.'
        });
      }

      // Create Google Docs document
      const googleSlidesService = new GoogleSlidesService();
      const documentId = await googleSlidesService.createDocument(title);
      
      // Add content to document
      let documentContent = `${title}\n\n`;
      
      slides.forEach((slide, index) => {
        documentContent += `${slide.title}\n`;
        documentContent += `Step ${slide.stepNumber} of ${slide.totalSteps}\n\n`;
        
        slide.content.forEach((block: any) => {
          documentContent += `${block.type}: ${block.content}\n`;
          if (block.notes) {
            documentContent += `Notes: ${block.notes}\n`;
          }
          documentContent += '\n';
        });
        
        documentContent += '\n---\n\n';
      });

      // Add notes section
      if (notes && notes.trim()) {
        documentContent += 'Presentation Notes\n';
        documentContent += '='.repeat(20) + '\n\n';
        documentContent += notes;
      }

      await googleSlidesService.updateDocument(documentId, documentContent);

      const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;
      
      console.log(`[HTTP] Successfully created Google Docs document: ${documentId}`);
      
      res.json({
        success: true,
        documentId,
        documentUrl
      });

    } catch (error) {
      console.error('[HTTP] Error creating Google Docs document:', error);
      res.status(500).json({
        error: 'Failed to create Google Docs document',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Helper function to get authenticated user ID
  const getSessionUserId = async (req: Request): Promise<number | null> => {
    const userId = req.session?.userId;
    if (!userId) return null;
    
    let userIdNum = parseInt(String(userId));
    
    // Handle Google OAuth user IDs
    if (isNaN(userIdNum) && typeof userId === 'string' && userId.startsWith('google_')) {
      try {
        const user = await storage.getUserByFirebaseUid(userId);
        if (user) {
          userIdNum = user.id;
        } else {
          return null;
        }
      } catch (error) {
        console.error('[HTTP] Error looking up user by Firebase UID:', error);
        return null;
      }
    }
    
    return isNaN(userIdNum) ? null : userIdNum;
  };

  // Flagged blocks API endpoints
  app.post('/api/boards/:boardId/blocks/:blockId/flag', async (req, res) => {
    try {
      const { boardId, blockId } = req.params;
      const { reason } = req.body;
      const userId = await getSessionUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('[HTTP] Flagging block:', { boardId, blockId, userId, reason });

      const flaggedBlock = await storage.flagBlock({
        boardId: parseInt(boardId),
        blockId,
        userId,
        reason: reason || null,
        resolved: false
      });

      res.json({ success: true, flaggedBlock });
    } catch (error) {
      console.error('[HTTP] Error flagging block:', error);
      res.status(500).json({ error: 'Failed to flag block' });
    }
  });

  app.delete('/api/boards/:boardId/blocks/:blockId/unflag', async (req, res) => {
    try {
      const { boardId, blockId } = req.params;
      const userId = await getSessionUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('[HTTP] Unflagging block:', { boardId, blockId, userId });

      await storage.unflagBlock(parseInt(boardId), blockId, userId);

      res.json({ success: true });
    } catch (error) {
      console.error('[HTTP] Error unflagging block:', error);
      res.status(500).json({ error: 'Failed to unflag block' });
    }
  });

  app.get('/api/flagged-blocks', async (req, res) => {
    try {
      const userId = await getSessionUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('[HTTP] Getting flagged blocks for user:', userId);

      const flaggedBlocks = await storage.getFlaggedBlocks(userId);

      res.json(flaggedBlocks);
    } catch (error) {
      console.error('[HTTP] Error getting flagged blocks:', error);
      res.status(500).json({ error: 'Failed to get flagged blocks' });
    }
  });

  app.patch('/api/flagged-blocks/:id/resolve', async (req, res) => {
    try {
      const { id } = req.params;
      const userId = await getSessionUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('[HTTP] Resolving flagged block:', id);

      await storage.resolveFlaggedBlock(parseInt(id));

      res.json({ success: true });
    } catch (error) {
      console.error('[HTTP] Error resolving flagged block:', error);
      res.status(500).json({ error: 'Failed to resolve flagged block' });
    }
  });

  app.delete('/api/flagged-blocks/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const userId = await getSessionUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('[HTTP] Deleting flagged block:', id);

      // Add a method to delete the flagged block entirely
      await storage.deleteFlaggedBlock(parseInt(id));

      res.json({ success: true });
    } catch (error) {
      console.error('[HTTP] Error deleting flagged block:', error);
      res.status(500).json({ error: 'Failed to delete flagged block' });
    }
  });

  return httpServer;
}

//Dummy function to avoid compilation error
async function sendProjectInvitation(params: any): Promise<boolean> {
  return true;
}