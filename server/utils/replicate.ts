import Replicate from 'replicate';

export class ReplicateService {
  private replicate: Replicate;

  constructor() {
    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
      throw new Error('REPLICATE_API_TOKEN environment variable is required');
    }
    
    this.replicate = new Replicate({
      auth: apiToken,
    });
  }

  async generateStoryboardImage(prompt: string): Promise<string> {
    try {
      console.log('[REPLICATE] === STARTING SDXL IMAGE GENERATION ===');
      console.log('[REPLICATE] Original prompt:', prompt);
      
      // Use the specified prompt template for storyboard sketches
      const styledPrompt = `Storyboard sketch, pencil-drawn, black-and-white, expressive character, side view. Scene: ${prompt}`;
      console.log('[REPLICATE] Styled prompt:', styledPrompt);
      
      console.log('[REPLICATE] Making SDXL API call...');
      
      const output = await this.replicate.run(
        "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        {
          input: {
            prompt: styledPrompt,
            width: 1024,
            height: 1024,
            num_outputs: 1,
            scheduler: "K_EULER",
            num_inference_steps: 50,
            guidance_scale: 7.5,
            apply_watermark: false,
            lora_scale: 0.6,
            refine: "expert_ensemble_refiner"
          }
        }
      ) as string[];

      console.log('[REPLICATE] API call completed, processing response...');

      if (!output || output.length === 0) {
        throw new Error('No image data returned from Replicate');
      }

      const imageUrl = output[0];
      
      if (!imageUrl) {
        throw new Error('No image URL returned from Replicate');
      }

      console.log('[REPLICATE] Successfully generated storyboard image:', imageUrl);
      return imageUrl;

    } catch (error: any) {
      console.error('[REPLICATE] Error generating image:', error);
      
      if (error?.message?.includes('authentication')) {
        throw new Error('Invalid Replicate API token. Please check your credentials.');
      }
      
      if (error?.message?.includes('quota') || error?.message?.includes('billing')) {
        throw new Error('Replicate API quota exceeded. Please check your billing.');
      }
      
      throw new Error(`Failed to generate storyboard image: ${error?.message || 'Unknown error'}`);
    }
  }

  // Method to check if image generation is available
  async healthCheck(): Promise<boolean> {
    try {
      // Try a simple model list to verify API connection
      const models = await this.replicate.models.list();
      return !!models;
    } catch (error) {
      console.error('[REPLICATE] Health check failed:', error);
      return false;
    }
  }
}

// Create singleton instance
export const replicateService = new ReplicateService();