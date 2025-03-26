import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the API with the key
const genAI = new GoogleGenerativeAI(import.meta.env.GOOGLE_AI_API_KEY);

interface GenerateTemplateOptions {
  projectType?: string;
  industry?: string;
  complexity?: 'simple' | 'detailed' | 'comprehensive';
}

export async function generateBlueprintTemplate(options: GenerateTemplateOptions) {
  try {
    if (!import.meta.env.GOOGLE_AI_API_KEY) {
      throw new Error('Google AI API key is not configured');
    }

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

    // Validate and parse the response
    try {
      const parsedTemplate = JSON.parse(text);
      return parsedTemplate;
    } catch (parseError) {
      console.error('Failed to parse AI response:', text);
      throw new Error('Failed to generate a valid template format');
    }
  } catch (error) {
    console.error('Error generating blueprint template:', error);
    if (error instanceof Error && error.message.includes('API_KEY_INVALID')) {
      throw new Error('Invalid API key configuration. Please check your settings.');
    }
    throw new Error('Failed to generate blueprint template. Please try again.');
  }
}