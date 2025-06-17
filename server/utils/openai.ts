import OpenAI from "openai";

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    console.log('[OPENAI] Initializing OpenAI service');
    console.log('[OPENAI] API Key present:', !!process.env.OPENAI_API_KEY);
    console.log('[OPENAI] API Key starts with:', process.env.OPENAI_API_KEY?.substring(0, 7) + '...' || 'MISSING');
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('[OPENAI] OpenAI client initialized successfully');
  }

  async generateStoryboardImage(prompt: string): Promise<string> {
    try {
      console.log('[OPENAI] === STARTING IMAGE GENERATION ===');
      console.log('[OPENAI] Original prompt:', prompt);
      
      // Add consistent style prefix for storyboard sketches
      const styledPrompt = `Storyboard panel, black-and-white sketch, pencil drawing, comic-book/graphic novel style, consistent character style, expressive face, minimal background, no UI. Scene: ${prompt}`;
      console.log('[OPENAI] Styled prompt:', styledPrompt);
      
      console.log('[OPENAI] Making DALL-E API call...');
      const response = await this.openai.images.generate({
        model: "dall-e-3", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        prompt: styledPrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "natural" // Use natural style for more sketch-like results
      });
      
      console.log('[OPENAI] API call completed, processing response...');

      if (!response.data || response.data.length === 0) {
        throw new Error('No image data returned from OpenAI');
      }

      const imageUrl = response.data[0].url;
      
      if (!imageUrl) {
        throw new Error('No image URL returned from OpenAI');
      }

      console.log('[OPENAI] Successfully generated storyboard image:', imageUrl);
      return imageUrl;

    } catch (error: any) {
      console.error('[OPENAI] Error generating image:', error);
      
      if (error?.code === 'insufficient_quota') {
        throw new Error('OpenAI API quota exceeded. Please check your billing.');
      }
      
      if (error?.code === 'invalid_api_key') {
        throw new Error('Invalid OpenAI API key. Please check your credentials.');
      }
      
      throw new Error(`Failed to generate storyboard image: ${error?.message || 'Unknown error'}`);
    }
  }

  async downloadAndStoreImage(imageUrl: string): Promise<string> {
    try {
      console.log('[OPENAI] Downloading image from OpenAI:', imageUrl);
      
      // Download the image from OpenAI
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // For now, return the original URL
      // In a production setup, you would upload this to Firebase Storage or similar
      console.log('[OPENAI] Image downloaded successfully, size:', buffer.length, 'bytes');
      
      // TODO: Implement actual storage to Firebase/Supabase
      // For now, return the original OpenAI URL (valid for 1 hour)
      return imageUrl;
      
    } catch (error: any) {
      console.error('[OPENAI] Error downloading/storing image:', error);
      throw new Error(`Failed to store image: ${error?.message || 'Unknown error'}`);
    }
  }
}