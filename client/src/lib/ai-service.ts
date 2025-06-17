import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the API with the key
const API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;

if (!API_KEY) {
  console.error('Google AI API key is not properly configured');
}

const genAI = new GoogleGenerativeAI(API_KEY);

interface GenerateTemplateOptions {
  projectType?: string;
  industry?: string;
  complexity?: 'simple' | 'detailed' | 'comprehensive';
}

export async function generateBlueprintTemplate(options: GenerateTemplateOptions) {
  try {
    if (!API_KEY) {
      throw new Error('Google AI API key is not configured. Please check your environment variables.');
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Create a customer journey blueprint template for ${options.industry || 'a general business'}.
      Project type: ${options.projectType || 'Customer Experience'}
      Level of detail: ${options.complexity || 'detailed'}

      Include the following sections:
      1. Key customer stages
      2. Customer actions
      3. Touch points
      4. Pain points
      5. Opportunities

      Format the response as a structured JSON object with the following fields:
      {
        "name": "Template name",
        "description": "Detailed description of the blueprint",
        "stages": ["Array of customer journey stages"],
        "actions": ["Array of customer actions"],
        "touchpoints": ["Array of touchpoints"],
        "painPoints": ["Array of pain points"],
        "opportunities": ["Array of improvement opportunities"]
      }`;

    console.log('Sending prompt to Google AI:', prompt);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log('Received response from Google AI:', text);

    try {
      const parsedTemplate = JSON.parse(text);
      return parsedTemplate;
    } catch (parseError) {
      console.error('Failed to parse AI response:', text);
      throw new Error('Failed to generate a valid template format');
    }
  } catch (error) {
    console.error('Error generating blueprint template:', error);
    if (error instanceof Error) {
      if (error.message.includes('API_KEY_INVALID')) {
        throw new Error('Invalid API key. Please check your API key configuration.');
      } else if (error.message.includes('not configured')) {
        throw new Error('API key is missing. Please make sure VITE_GOOGLE_AI_API_KEY is set in your environment.');
      }
    }
    throw new Error('Failed to generate blueprint template. Please try again later.');
  }
}