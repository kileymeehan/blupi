export interface Block {
  id: string;
  type: string;
  content: string;
}

export interface SlideExportData {
  boardName: string;
  phases: {
    name: string;
    steps: {
      name: string;
      blocks: Block[];
    }[];
  }[];
}

export const exportToGoogleSlides = async (data: SlideExportData): Promise<string> => {
  const response = await fetch('/api/google-slides/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to export to Google Slides: ${response.statusText}`);
  }

  const result = await response.json();
  return result.presentationUrl;
};

export const getBlockIcon = (blockType: string): string => {
  const iconMap: Record<string, string> = {
    'touchpoint': '👤',
    'email': '📧',
    'video': '📹',
    'pendo': '💬',
    'role': '👥',
    'process': '⚙️',
    'friction': '⚠️',
    'policy': '📋',
    'technology': '💻',
    'rationale': '💭',
    'question': '❓',
    'note': '📝',
    'hypothesis': '🔬',
    'insight': '💡',
    'metric': '📊',
    'experiment': '🧪',
    'custom-divider': '➖'
  };
  
  return iconMap[blockType] || '📋';
};