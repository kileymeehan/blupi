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
      console.log('[REPLICATE] Raw output constructor:', output?.constructor?.name);
      console.log('[REPLICATE] Raw output length:', Array.isArray(output) ? output.length : 'not array');
      console.log('[REPLICATE] Raw output:', output);
      
      if (Array.isArray(output) && output.length > 0) {
        console.log('[REPLICATE] First item constructor:', output[0]?.constructor?.name);
        console.log('[REPLICATE] First item properties:', Object.getOwnPropertyNames(output[0] || {}));
      }

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
            // Handle ReadableStream - check if it contains URL or image data
            if (firstItem instanceof ReadableStream) {
              console.log('[REPLICATE] Reading stream content...');
              const reader = firstItem.getReader();
              const chunks = [];
              
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
              }
              
              // Combine chunks
              const buffer = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
              let offset = 0;
              for (const chunk of chunks) {
                buffer.set(chunk, offset);
                offset += chunk.length;
              }
              
              // Check if this is text (URL) or binary (image data)
              console.log('[REPLICATE] Buffer size:', buffer.length);
              console.log('[REPLICATE] First 20 bytes:', Array.from(buffer.slice(0, 20)).map(b => b.toString(16)).join(' '));
              
              // If it starts with PNG header or other image format, it's image data
              const isPNG = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
              const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8;
              const isWebP = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
              
              if (isPNG || isJPEG || isWebP) {
                console.log('[REPLICATE] Stream contains image data, converting to URL...');
                
                // Save the image data to a file and return a URL
                const crypto = await import('crypto');
                const fs = await import('fs');
                const path = await import('path');
                
                // Generate unique filename
                const imageId = crypto.randomUUID();
                const extension = isPNG ? '.png' : isJPEG ? '.jpg' : '.webp';
                const filename = `storyboard-${imageId}${extension}`;
                
                // Save to public/images directory
                const publicDir = path.join(process.cwd(), 'client', 'public', 'images');
                const filePath = path.join(publicDir, filename);
                
                // Ensure directory exists
                if (!fs.existsSync(publicDir)) {
                  fs.mkdirSync(publicDir, { recursive: true });
                }
                
                // Write image data to file
                fs.writeFileSync(filePath, buffer);
                
                // Return URL path
                imageUrl = `/images/${filename}`;
                console.log('[REPLICATE] Saved image data to:', imageUrl);
              } else {
                // Try to decode as text URL
                imageUrl = new TextDecoder().decode(buffer).trim();
                console.log('[REPLICATE] Stream decoded as text:', imageUrl);
              }
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