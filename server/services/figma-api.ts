import axios from 'axios';

// Figma API types
interface FigmaFile {
  document: FigmaNode;
  components: Record<string, FigmaComponent>;
  componentSets: Record<string, FigmaComponentSet>;
  schemaVersion: number;
  styles: Record<string, FigmaStyle>;
  name: string;
  role: string;
  lastModified: string;
  editorType: string;
  linkAccess: string;
}

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  componentPropertyDefinitions?: Record<string, any>;
  fills?: any[];
  strokes?: any[];
  effects?: any[];
  constraints?: any;
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface FigmaComponent {
  key: string;
  name: string;
  description: string;
  componentSetId?: string;
  documentationLinks?: any[];
}

interface FigmaComponentSet {
  key: string;
  name: string;
  description: string;
}

interface FigmaStyle {
  key: string;
  name: string;
  description: string;
  styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
}

interface FigmaTeamProjects {
  projects: FigmaProject[];
}

interface FigmaProject {
  id: string;
  name: string;
}

interface FigmaProjectFiles {
  files: FigmaFileReference[];
}

interface FigmaFileReference {
  key: string;
  name: string;
  thumbnail_url: string;
  last_modified: string;
}

export class FigmaAPI {
  private baseURL = 'https://api.figma.com/v1';
  private token: string;

  constructor() {
    this.token = process.env.FIGMA_ACCESS_TOKEN || '';
    if (!this.token) {
      throw new Error('FIGMA_ACCESS_TOKEN environment variable is required');
    }
  }

  private async request<T>(endpoint: string): Promise<T> {
    try {
      const response = await axios.get(`${this.baseURL}${endpoint}`, {
        headers: {
          'X-Figma-Token': this.token,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Figma API Error:', error);
      throw error;
    }
  }

  // Get user's teams and projects
  async getTeamProjects(teamId: string): Promise<FigmaTeamProjects> {
    return this.request<FigmaTeamProjects>(`/teams/${teamId}/projects`);
  }

  // Get files in a project
  async getProjectFiles(projectId: string): Promise<FigmaProjectFiles> {
    return this.request<FigmaProjectFiles>(`/projects/${projectId}/files`);
  }

  // Get file details including components
  async getFile(fileKey: string): Promise<FigmaFile> {
    return this.request<FigmaFile>(`/files/${fileKey}`);
  }

  // Get components from a file
  async getFileComponents(fileKey: string) {
    const file = await this.getFile(fileKey);
    return {
      components: file.components,
      componentSets: file.componentSets,
      styles: file.styles
    };
  }

  // Get component images
  async getImages(fileKey: string, nodeIds: string[], format: 'jpg' | 'png' | 'svg' | 'pdf' = 'png', scale: number = 1) {
    const nodeIdsParam = nodeIds.join(',');
    return this.request<{ images: Record<string, string> }>(`/images/${fileKey}?ids=${nodeIdsParam}&format=${format}&scale=${scale}`);
  }

  // Extract design system metadata from components
  extractDesignSystemData(file: FigmaFile) {
    const designSystem = {
      components: [] as any[],
      tokens: {
        colors: [] as any[],
        typography: [] as any[],
        spacing: [] as any[],
        effects: [] as any[]
      }
    };

    // Extract components with metadata
    Object.entries(file.components).forEach(([key, component]) => {
      designSystem.components.push({
        key,
        name: component.name,
        description: component.description,
        category: this.categorizeComponent(component.name),
        tags: this.extractTags(component.description),
        componentSetId: component.componentSetId
      });
    });

    // Extract design tokens from styles
    Object.entries(file.styles).forEach(([key, style]) => {
      const token = {
        key,
        name: style.name,
        description: style.description,
        type: style.styleType.toLowerCase()
      };

      switch (style.styleType) {
        case 'FILL':
          designSystem.tokens.colors.push(token);
          break;
        case 'TEXT':
          designSystem.tokens.typography.push(token);
          break;
        case 'EFFECT':
          designSystem.tokens.effects.push(token);
          break;
      }
    });

    return designSystem;
  }

  // Categorize components based on naming conventions
  private categorizeComponent(name: string): string {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('button') || lowerName.includes('btn')) return 'actions';
    if (lowerName.includes('input') || lowerName.includes('form') || lowerName.includes('field')) return 'forms';
    if (lowerName.includes('card') || lowerName.includes('container')) return 'layout';
    if (lowerName.includes('nav') || lowerName.includes('menu') || lowerName.includes('header')) return 'navigation';
    if (lowerName.includes('modal') || lowerName.includes('dialog') || lowerName.includes('popup')) return 'overlays';
    if (lowerName.includes('icon') || lowerName.includes('badge') || lowerName.includes('avatar')) return 'display';
    
    return 'misc';
  }

  // Extract semantic tags from component descriptions
  private extractTags(description: string): string[] {
    if (!description) return [];
    
    const tags: string[] = [];
    const tagMatches = description.match(/#\w+/g);
    if (tagMatches) {
      tags.push(...tagMatches.map(tag => tag.substring(1)));
    }
    
    return tags;
  }

  // Search components by semantic meaning
  searchComponents(designSystem: any, query: string): any[] {
    const queryLower = query.toLowerCase();
    
    return designSystem.components.filter((component: any) => {
      return (
        component.name.toLowerCase().includes(queryLower) ||
        component.description.toLowerCase().includes(queryLower) ||
        component.tags.some((tag: string) => tag.toLowerCase().includes(queryLower)) ||
        component.category.toLowerCase().includes(queryLower)
      );
    });
  }
}

export default new FigmaAPI();