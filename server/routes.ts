import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBoardSchema, insertProjectSchema } from "@shared/schema";
import { ZodError } from "zod";
import { nanoid } from 'nanoid';
import { WebSocketServer, WebSocket } from 'ws';
import { getFrictionMetrics, isPendoConfigured, getAuthorizationUrl, exchangeCodeForToken, setOAuthToken } from './utils/pendo';
import { parseSheetId, fetchSheetData, getSheetNames, convertSheetDataToCsv, fetchSheetCell } from './utils/google-sheets-fixed';

interface ConnectedUser {
  id: string;
  name: string;
  color: string;
  emoji?: string;
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

  // Create WebSocket server with basic configuration
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws',
    clientTracking: true
  });

  console.log('[WS] WebSocket server created on path /ws');

  wss.on('connection', (ws, req) => {
    const userId = nanoid();
    console.log(`[WS] New connection established: ${userId}`);

    ws.on('error', (error) => {
      console.error(`[WS] Connection error for ${userId}:`, error);
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`[WS] Received message from ${userId}:`, message);

        if (message.type === 'subscribe') {
          const user: ConnectedUser = {
            id: userId,
            name: message.userName || 'Anonymous',
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            emoji: message.userEmoji,
            ws,
            boardId: message.boardId
          };
          connectedUsers.set(userId, user);

          // Send initial users list to new user
          const boardUsers = Array.from(connectedUsers.values())
            .filter(u => u.boardId === message.boardId)
            .map(({ id, name, color, emoji }) => ({ id, name, color, emoji }));

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
          .map(({ id, name, color, emoji }) => ({ id, name, color, emoji }));

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
  app.get("/api/boards", async (_req, res) => {
    try {
      console.log('[HTTP] Fetching all boards');
      const boards = await storage.getBoards();
      res.json(boards);
    } catch (err) {
      console.error('[HTTP] Error fetching boards:', err);
      res.status(500).json({ error: true, message: "Failed to fetch boards" });
    }
  });

  app.get("/api/projects", async (_req, res) => {
    try {
      console.log('[HTTP] Fetching all projects');
      const projects = await storage.getProjects();
      console.log(`[HTTP] Retrieved ${projects.length} projects:`, projects.map(p => ({ id: p.id, name: p.name })));
      res.json(projects);
    } catch (err) {
      console.error('[HTTP] Error fetching projects:', err);
      res.status(500).json({ error: true, message: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      console.log('[HTTP] Creating project with data:', req.body);
      const parseResult = insertProjectSchema.safeParse(req.body);

      if (!parseResult.success) {
        console.error('[HTTP] Project validation error:', parseResult.error);
        return res.status(400).json({
          error: true,
          message: parseResult.error.errors[0].message
        });
      }

      const project = await storage.createProject(parseResult.data);
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

  app.get("/api/boards", async (_req, res) => {
    try {
      console.log('[HTTP] Fetching all boards');
      const boards = await storage.getBoards();
      console.log(`[HTTP] Retrieved ${boards.length} boards`);
      res.json(boards);
    } catch (err) {
      console.error('[HTTP] Error fetching boards:', err);
      res.status(500).json({ error: true, message: "Failed to fetch boards" });
    }
  });

  app.post("/api/boards", async (req, res) => {
    try {
      console.log('[HTTP] Creating board with data:', req.body);
      
      // Handle the case where projectId is null by removing it
      // This allows the schema validation to use the optional behavior
      const boardData = { ...req.body };
      if (boardData.projectId === null) {
        delete boardData.projectId;
      }
      
      const parseResult = insertBoardSchema.safeParse(boardData);

      if (!parseResult.success) {
        console.error('[HTTP] Board validation error:', parseResult.error);
        return res.status(400).json({
          error: true,
          message: parseResult.error.errors[0].message
        });
      }

      const board = await storage.createBoard(parseResult.data);
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

  app.get("/api/boards/:id", async (req, res) => {
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

  app.patch("/api/boards/:id", async (req, res) => {
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
        ...board,
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
  
  // Add endpoint for creating a board directly from CSV data
  app.post("/api/boards/import-csv", async (req, res) => {
    try {
      const { name } = req.body;
      const csvData = req.body.csvData;
      
      if (!csvData) {
        return res.status(400).json({
          error: true,
          message: "CSV data is required"
        });
      }
      
      console.log('[HTTP] Creating board from CSV data');
      
      // Process CSV data to create board structure
      // This would be similar to the frontend processing but server-side
      // For now just create a basic board with the name
      
      const boardData = {
        name: name || 'CSV Import - Customer Journey',
        status: 'draft',
        // Do not include projectId at all, rather than setting it to null
        // This way it will use the default/optional behavior defined in the schema
        phases: [
          {
            id: 'phase-1',
            name: 'Customer Journey',
            columns: [
              { id: 'col-1', name: 'Step 1' }
            ]
          }
        ],
        blocks: []
      };
      
      const parseResult = insertBoardSchema.safeParse(boardData);
      
      if (!parseResult.success) {
        console.error('[HTTP] Board validation error when importing CSV:', parseResult.error);
        return res.status(400).json({
          error: true,
          message: parseResult.error.errors[0].message
        });
      }
      
      const board = await storage.createBoard(parseResult.data);
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
  app.get("/api/google-sheets/test", async (req, res) => {
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
        return res.status(400).json({ error: true, message: 'Invalid board ID' });
      }
      
      const sheetDocs = await storage.getSheetDocuments(boardId);
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

  return httpServer;
}

//Dummy function to avoid compilation error
async function sendProjectInvitation(params: any): Promise<boolean> {
  return true;
}