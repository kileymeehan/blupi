import OpenAI from "openai";
import { isProduction } from '../../config/environment';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
let openai: OpenAI | null = null;

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.log('[AI-CLASSIFIER] Service initialized successfully');
} else {
  console.warn('[AI-CLASSIFIER] API key not configured - AI classification features are disabled');
}

export interface ClassifiedBlock {
  content: string;
  type: 'touchpoint' | 'friction' | 'process' | 'policy' | 'technology' | 'rationale' | 'question' | 'note' | 'metrics' | 'pendo';
  notes: string;
  emoji: string;
  department: string;
  confidence: number;
}

export interface AnalysisRow {
  [key: string]: string | number;
}

const SYSTEM_PROMPT = `You are an expert product experience analyst that helps classify data into customer journey workflow blocks. 

Your task is to analyze data rows and classify each meaningful entry into one of these block types:

- **touchpoint**: Customer interactions, steps, or actions in the journey
- **friction**: Pain points, obstacles, or areas where customers struggle
- **process**: Internal business processes or workflows
- **policy**: Rules, guidelines, or governance elements
- **technology**: Tools, systems, or technical components
- **rationale**: Reasoning, explanations, or justifications
- **question**: Open questions or areas needing investigation
- **note**: General observations or additional context
- **metrics**: Numbers, measurements, or KPIs
- **pendo**: Analytics data or user behavior insights

For each meaningful data point, provide:
1. **content**: A clear, concise description (max 50 characters)
2. **type**: One of the block types above
3. **notes**: Detailed explanation or context (max 200 characters)
4. **emoji**: Leave empty (no emojis)
5. **department**: Likely department responsible (e.g., "Marketing", "Support", "Engineering", "Sales", "Product", etc.)
6. **confidence**: Your confidence level (0-1) in this classification

Skip empty cells, headers, or irrelevant data. Focus on actionable insights and meaningful content.

Respond with a JSON array of classified blocks.`;

export async function classifyDataWithAI(rows: AnalysisRow[]): Promise<ClassifiedBlock[]> {
  try {
    console.log('[AI] Starting data classification for', rows.length, 'rows');
    
    if (!openai) {
      throw new Error('OpenAI service is not configured. Please add OPENAI_API_KEY to your environment variables to enable AI classification.');
    }
    
    // Limit to first 10 rows to control costs and response time
    const limitedRows = rows.slice(0, 10);
    
    // Format the data for analysis
    const dataContext = limitedRows.map((row, index) => {
      const rowData = Object.entries(row)
        .filter(([key, value]) => value && value.toString().trim())
        .map(([key, value]) => `${key}: ${value}`)
        .join(' | ');
      return `Row ${index + 1}: ${rowData}`;
    }).join('\n');

    const userPrompt = `Analyze the following CSV data and classify meaningful entries into workflow blocks.

Data:
${dataContext}

Return a JSON object with a "blocks" array. Each block should have:
- content (max 50 chars)
- type (one of: touchpoint, friction, process, metrics, note)  
- notes (max 200 chars)
- emoji (single relevant emoji)
- department (e.g., Marketing, Support, Product)
- confidence (0-1)

Example: {"blocks": [{"content": "User login", "type": "touchpoint", "notes": "Customer authentication step", "emoji": "🔑", "department": "Product", "confidence": 0.9}]}`;

    console.log('[AI] Sending request to OpenAI for classification');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert at analyzing data and classifying it into workflow blocks. Always respond with valid JSON." },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1500
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    console.log('[AI] Received response from OpenAI:', content.substring(0, 200) + '...');
    
    const result = JSON.parse(content);
    const blocks = result.blocks || [];
    
    console.log('[AI] Successfully classified', blocks.length, 'blocks');
    
    return blocks.filter((block: any) => 
      block.content && 
      block.type && 
      block.content.length > 0
    );
    
  } catch (error) {
    console.error('[AI] Error classifying data:', error);
    throw new Error(`AI classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function analyzeCsvStructure(headers: string[], sampleRows: AnalysisRow[]): Promise<{
  suggestedOrientation: 'rows' | 'columns';
  reasoning: string;
  confidence: number;
}> {
  try {
    console.log('[AI] Analyzing CSV structure');
    
    if (!openai) {
      console.warn('[AI] OpenAI not configured, using default orientation');
      return {
        suggestedOrientation: 'columns',
        reasoning: 'Default orientation (OpenAI not configured)',
        confidence: 0.5
      };
    }
    
    const headerContext = headers.join(', ');
    const sampleData = sampleRows.slice(0, 3).map(row => 
      Object.values(row).join(' | ')
    ).join('\n');

    const prompt = `Analyze this CSV structure and determine if journey steps are better represented as rows or columns:

Headers: ${headerContext}

Sample data:
${sampleData}

Respond with JSON containing:
- suggestedOrientation: "rows" or "columns" 
- reasoning: Brief explanation (max 100 chars)
- confidence: 0-1 score`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a data analysis expert. Analyze CSV structure and suggest optimal orientation for workflow mapping." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 200
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      suggestedOrientation: result.suggestedOrientation || 'columns',
      reasoning: result.reasoning || 'Based on data structure analysis',
      confidence: result.confidence || 0.7
    };
    
  } catch (error) {
    console.error('[AI] Error analyzing CSV structure:', error);
    return {
      suggestedOrientation: 'columns',
      reasoning: 'Default orientation due to analysis error',
      confidence: 0.5
    };
  }
}