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
      console.log('[REPLICATE] Raw prompt received:', JSON.stringify(prompt));
      console.log('[REPLICATE] Prompt type:', typeof prompt);
      console.log('[REPLICATE] Prompt length:', prompt?.length);
      
      // Use clean, direct prompt without complex styling
      const styledPrompt = `${prompt}, simple black and white illustration`;
      console.log('[REPLICATE] Final styled prompt sent to SDXL:', JSON.stringify(styledPrompt));
      
      console.log('[REPLICATE] Making SDXL API call...');
      
      const output = await this.replicate.run(
        "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        {
          input: {
            prompt: styledPrompt,
            negative_prompt: "text, words, letters, photorealistic, photo, complex background, panels, frames, borders",
            width: 1024,
            height: 1024,
            num_outputs: 1,
            scheduler: "DPMSolverMultistep",
            num_inference_steps: 30,
            guidance_scale: 7.5,
            apply_watermark: false
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
      
      // Basic URL validation - accept both external URLs and local file paths
      if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
        console.error('[REPLICATE] Invalid URL format:', imageUrl);
        throw new Error('Invalid URL format returned from Replicate');
      }

      console.log('[REPLICATE] Successfully generated storyboard image:', imageUrl);
      console.log('[REPLICATE] Final URL type:', typeof imageUrl);
      
      // Production diagnostic logging
      console.log('[REPLICATE] [PRODUCTION DEBUG] Environment checks:');
      console.log('[REPLICATE] [PRODUCTION DEBUG] - NODE_ENV:', process.env.NODE_ENV);
      console.log('[REPLICATE] [PRODUCTION DEBUG] - Working directory:', process.cwd());
      console.log('[REPLICATE] [PRODUCTION DEBUG] - Image URL generated:', imageUrl);
      console.log('[REPLICATE] [PRODUCTION DEBUG] - URL starts with http:', imageUrl.startsWith('http'));
      console.log('[REPLICATE] [PRODUCTION DEBUG] - URL starts with /:', imageUrl.startsWith('/'));
      console.log('[REPLICATE] [PRODUCTION DEBUG] - REPL_SLUG:', process.env.REPL_SLUG);
      console.log('[REPLICATE] [PRODUCTION DEBUG] - REPL_OWNER:', process.env.REPL_OWNER);
      console.log('[REPLICATE] [PRODUCTION DEBUG] - REPLIT_DEPLOYMENT:', process.env.REPLIT_DEPLOYMENT);
      
      // Check if file exists for local URLs
      if (imageUrl.startsWith('/')) {
        const fs = await import('fs');
        const path = await import('path');
        
        // Check multiple possible paths
        const possiblePaths = [
          path.join(process.cwd(), 'client', 'public', imageUrl),
          path.join(process.cwd(), 'public', imageUrl),
          path.join(process.cwd(), imageUrl.substring(1)), // Remove leading slash
          path.join(process.cwd(), 'server', '..', 'client', 'public', imageUrl),
          path.join(process.cwd(), 'server', '..', 'public', imageUrl)
        ];
        
        console.log('[REPLICATE] [PRODUCTION DEBUG] - Checking possible file paths:');
        for (const filePath of possiblePaths) {
          const exists = fs.existsSync(filePath);
          console.log(`[REPLICATE] [PRODUCTION DEBUG]   - ${filePath}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
          if (exists) {
            const stats = fs.statSync(filePath);
            console.log(`[REPLICATE] [PRODUCTION DEBUG]     Size: ${stats.size} bytes, Permissions: ${stats.mode.toString(8)}`);
          }
        }
        
        // Also check directory structure
        const imageDir = path.join(process.cwd(), 'client', 'public', 'images');
        const imageDirExists = fs.existsSync(imageDir);
        console.log('[REPLICATE] [PRODUCTION DEBUG] - Images directory exists:', imageDirExists);
        if (imageDirExists) {
          const files = fs.readdirSync(imageDir);
          console.log('[REPLICATE] [PRODUCTION DEBUG] - Files in images directory:', files.length);
          console.log('[REPLICATE] [PRODUCTION DEBUG] - Recent files:', files.slice(-5));
        }
      }
      
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