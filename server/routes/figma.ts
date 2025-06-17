import { Router } from 'express';
import figmaAPI from '../services/figma-api.js';

const router = Router();

// Get file contents and design system data
router.get('/files/:fileKey', async (req, res) => {
  try {
    const { fileKey } = req.params;
    console.log(`[Figma] Fetching file: ${fileKey}`);
    
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

// Get component images
router.get('/files/:fileKey/images', async (req, res) => {
  try {
    const { fileKey } = req.params;
    const { nodeIds, format = 'png', scale = '1' } = req.query;
    
    if (!nodeIds) {
      return res.status(400).json({ error: 'nodeIds parameter is required' });
    }
    
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

// Search components by prompt/query
router.post('/files/:fileKey/search', async (req, res) => {
  try {
    const { fileKey } = req.params;
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    console.log(`[Figma] Searching components in ${fileKey} for: "${query}"`);
    
    const file = await figmaAPI.getFile(fileKey);
    const designSystem = figmaAPI.extractDesignSystemData(file);
    const results = figmaAPI.searchComponents(designSystem, query);
    
    res.json({ results, total: results.length });
  } catch (error) {
    console.error('[Figma] Error searching components:', error);
    res.status(500).json({ error: 'Failed to search components' });
  }
});

// Get team projects
router.get('/teams/:teamId/projects', async (req, res) => {
  try {
    const { teamId } = req.params;
    console.log(`[Figma] Fetching projects for team: ${teamId}`);
    
    const projects = await figmaAPI.getTeamProjects(teamId);
    res.json(projects);
  } catch (error) {
    console.error('[Figma] Error fetching team projects:', error);
    res.status(500).json({ error: 'Failed to fetch team projects' });
  }
});

// Get project files
router.get('/projects/:projectId/files', async (req, res) => {
  try {
    const { projectId } = req.params;
    console.log(`[Figma] Fetching files for project: ${projectId}`);
    
    const files = await figmaAPI.getProjectFiles(projectId);
    res.json(files);
  } catch (error) {
    console.error('[Figma] Error fetching project files:', error);
    res.status(500).json({ error: 'Failed to fetch project files' });
  }
});

export default router;