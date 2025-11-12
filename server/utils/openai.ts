import OpenAI from 'openai';
import { isProduction } from '../../config/environment';

export class OpenAIService {
  private openai: OpenAI | null;
  private isEnabled: boolean;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.warn('[OPENAI] API key not configured - AI storyboard generation is disabled');
      this.openai = null;
      this.isEnabled = false;
      return;
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
    this.isEnabled = true;
    console.log('[OPENAI] Service initialized successfully');
  }

  async generateStoryboardImage(prompt: string): Promise<string> {
    if (!this.isEnabled || !this.openai) {
      console.warn('[OPENAI] Service not available - OpenAI API key not configured');
      throw new Error('OpenAI service is not configured. Please add OPENAI_API_KEY to your environment variables to enable AI storyboard generation.');
    }
    
    try {
      console.log('[OPENAI] === STARTING DALL-E 3 IMAGE GENERATION ===');
      console.log('[OPENAI] Raw prompt received:', JSON.stringify(prompt));
      
      // Use contextual prompt with environment focus and generic representation
      const styledPrompt = `${prompt}. Show the full scene with environment and context, not just close-up of person. Simple cartoon style, black and white line drawing, generic non-specific people (stick figures or basic shapes), show setting/location clearly. Use 1-3 panels if helpful to tell the story. Minimal clean style.`;
      console.log('[OPENAI] Final styled prompt sent to DALL-E 3:', JSON.stringify(styledPrompt));
      
      console.log('[OPENAI] Making DALL-E 3 API call...');
      
      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt: styledPrompt,
        size: "1024x1024",
        quality: "standard",
        n: 1,
      });

      console.log('[OPENAI] API call completed, processing response...');
      
      if (!response.data || response.data.length === 0) {
        throw new Error('No image data received from DALL-E 3');
      }

      const imageUrl = response.data[0].url;
      if (!imageUrl) {
        throw new Error('No image URL received from DALL-E 3');
      }

      console.log('[OPENAI] Successfully generated image URL:', imageUrl);
      return imageUrl;

    } catch (error) {
      console.error('[OPENAI] Error generating storyboard image:', error);
      throw new Error(`Failed to generate storyboard image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.isEnabled || !this.openai) {
      return false;
    }
    
    try {
      await this.openai.models.list();
      return true;
    } catch (error) {
      console.error('[OPENAI] Health check failed:', error);
      return false;
    }
  }
}

export const openaiService = new OpenAIService();