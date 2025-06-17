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
      );

      console.log('[REPLICATE] API call completed, processing response...');
      console.log('[REPLICATE] Raw output type:', typeof output);
      console.log('[REPLICATE] Raw output:', output);

      // Handle different response types from Replicate
      let imageUrl: string;
      
      if (Array.isArray(output)) {
        // Standard array response
        if (output.length === 0) {
          throw new Error('No image data returned from Replicate');
        }
        
        const firstItem = output[0];
        console.log('[REPLICATE] First item type:', typeof firstItem);
        console.log('[REPLICATE] First item:', firstItem);
        
        if (typeof firstItem === 'string') {
          imageUrl = firstItem;
        } else if (firstItem && typeof firstItem === 'object') {
          // Handle ReadableStream - need to read the stream to get the URL
          console.log('[REPLICATE] Attempting to read stream...');
          
          try {
            // Convert ReadableStream to string
            if (firstItem instanceof ReadableStream) {
              const reader = firstItem.getReader();
              const chunks = [];
              
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
              }
              
              // Combine chunks and decode as text
              const buffer = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
              let offset = 0;
              for (const chunk of chunks) {
                buffer.set(chunk, offset);
                offset += chunk.length;
              }
              
              imageUrl = new TextDecoder().decode(buffer);
              console.log('[REPLICATE] Stream decoded to:', imageUrl);
            } else {
              // Fallback: try to extract URL if it's a response object
              imageUrl = firstItem.url || firstItem.href || firstItem.toString();
              console.log('[REPLICATE] Extracted URL from object:', imageUrl);
            }
          } catch (streamError) {
            console.error('[REPLICATE] Stream reading failed:', streamError);
            throw new Error('Failed to read stream response from Replicate');
          }
        } else {
          console.error('[REPLICATE] Unexpected first item format:', firstItem);
          throw new Error('Unexpected item format in Replicate response array');
        }
      } else if (typeof output === 'string') {
        // Direct string URL
        imageUrl = output;
      } else {
        // Handle other response formats
        console.error('[REPLICATE] Unexpected output format:', output);
        throw new Error('Unexpected response format from Replicate API');
      }
      
      // Validate that we have a proper URL string
      if (!imageUrl || typeof imageUrl !== 'string') {
        console.error('[REPLICATE] Invalid image URL:', imageUrl, typeof imageUrl);
        throw new Error('No valid image URL returned from Replicate');
      }
      
      // Basic URL validation
      if (!imageUrl.startsWith('http')) {
        console.error('[REPLICATE] Invalid URL format:', imageUrl);
        throw new Error('Invalid URL format returned from Replicate');
      }

      console.log('[REPLICATE] Successfully generated storyboard image:', imageUrl);
      console.log('[REPLICATE] Final URL type:', typeof imageUrl);
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