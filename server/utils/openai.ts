import OpenAI from 'openai';

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateStoryboardImage(prompt: string): Promise<string> {
    try {
      console.log('[OPENAI] === STARTING DALL-E 3 IMAGE GENERATION ===');
      console.log('[OPENAI] Raw prompt received:', JSON.stringify(prompt));
      
      // Use clean, direct prompt with cartoon style and generic representation
      const styledPrompt = `${prompt}. Simple cartoon line drawing, black and white, minimal style, stick figures or basic shapes, non-specific generic people, clean composition.`;
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