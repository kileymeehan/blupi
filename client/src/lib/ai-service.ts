import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the API with the key
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_AI_API_KEY);

interface GenerateTemplateOptions {
  projectType?: string;
  industry?: string;
  complexity?: 'simple' | 'detailed' | 'comprehensive';
}

export async function generateBlueprintTemplate(options: GenerateTemplateOptions) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Create a customer journey blueprint template for ${options.industry || 'a general business'}.
      Project type: ${options.projectType || 'Customer Experience'}
      Level of detail: ${options.complexity || 'detailed'}
      
      Include the following sections:
      1. Key customer stages
      2. Customer actions
      3. Touch points
      4. Pain points
      5. Opportunities
      
      Format the response as a structured JSON object that can be used to initialize a blueprint.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text);
  } catch (error) {
    console.error('Error generating blueprint template:', error);
    throw new Error('Failed to generate blueprint template. Please try again.');
  }
}
