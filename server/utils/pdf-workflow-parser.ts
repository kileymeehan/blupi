import OpenAI from "openai";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import pdf2pic from "pdf2pic";
import { isProduction } from '../../config/environment';

let openai: OpenAI | null = null;

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.log('[PDF-PARSER] OpenAI service initialized successfully');
} else {
  console.warn('[PDF-PARSER] OpenAI API key not configured - PDF AI analysis features are disabled');
}

export interface WorkflowStep {
  stepNumber: number;
  title: string;
  description: string;
  imageBase64: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export async function parseWorkflowPDF(pdfBuffer: Buffer): Promise<WorkflowStep[]> {
  try {
    console.log(`[PDF Parser] Processing PDF buffer of size: ${pdfBuffer.length} bytes`);
    
    // Convert PDF pages to individual images
    const pageImages = await convertPDFToImages(pdfBuffer);
    console.log(`[PDF Parser] Extracted ${pageImages.length} page images from PDF`);
    
    if (pageImages.length === 0) {
      throw new Error("No pages could be extracted from PDF");
    }
    
    const steps: WorkflowStep[] = [];
    
    // Process each page image
    for (let i = 0; i < pageImages.length; i++) {
      const pageNumber = i + 1;
      const imageBuffer = pageImages[i];
      
      console.log(`[PDF Parser] Processing page ${pageNumber}, image size: ${imageBuffer.length} bytes`);
      
      // Convert image buffer to base64
      const imageBase64 = imageBuffer.toString('base64');
      
      // Create workflow step for this page
      const step: WorkflowStep = {
        stepNumber: pageNumber,
        title: `Step ${pageNumber} - Workflow Page ${pageNumber}`,
        description: `Process step extracted from page ${pageNumber} of the PDF document. Review and customize this step based on the content shown in the image.`,
        imageBase64: imageBase64
      };
      
      steps.push(step);
    }
    
    console.log(`[PDF Parser] Successfully created ${steps.length} workflow steps with individual page images`);
    return steps;
    
  } catch (error) {
    console.error("Error parsing workflow PDF:", error);
    
    // Fallback: create a single step with the entire PDF
    console.log('[PDF Parser] Creating fallback step due to processing error');
    return [{
      stepNumber: 1,
      title: "Imported PDF Workflow",
      description: "PDF workflow document imported. Image extraction failed, but you can still reference the PDF content. Please break this down into individual steps as needed.",
      imageBase64: pdfBuffer.toString('base64')
    }];
  }
}

async function convertPDFToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
  try {
    console.log('[PDF Parser] Converting PDF pages to images using pdf2pic');
    
    // Create a temporary file path for the PDF buffer
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    
    const tempDir = os.tmpdir();
    const tempPdfPath = path.join(tempDir, `temp-pdf-${Date.now()}.pdf`);
    
    // Write PDF buffer to temporary file
    fs.writeFileSync(tempPdfPath, pdfBuffer);
    
    // Configure pdf2pic to convert PDF pages to PNG images
    const convert = pdf2pic.fromPath(tempPdfPath, {
      density: 150,           // 150 DPI for good quality
      saveFilename: "page",   // Base filename
      savePath: tempDir,      // Save to temp directory
      format: "png",          // PNG format
      width: 800,             // Max width
      height: 1200            // Max height
    });
    
    // Get the number of pages in the PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    console.log(`[PDF Parser] PDF has ${pageCount} pages to convert`);
    
    const imageBuffers: Buffer[] = [];
    
    // Convert each page to an image
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      try {
        console.log(`[PDF Parser] Converting page ${pageNum}/${pageCount}`);
        
        const result = await convert(pageNum, { responseType: "buffer" });
        
        if (result && result.buffer) {
          imageBuffers.push(result.buffer);
          console.log(`[PDF Parser] Successfully converted page ${pageNum}, buffer size: ${result.buffer.length} bytes`);
        } else {
          console.warn(`[PDF Parser] Failed to convert page ${pageNum} - no buffer returned`);
        }
      } catch (pageError) {
        console.error(`[PDF Parser] Error converting page ${pageNum}:`, pageError);
        // Continue with other pages even if one fails
      }
    }
    
    // Clean up temporary PDF file
    try {
      fs.unlinkSync(tempPdfPath);
    } catch (cleanupError) {
      console.warn('[PDF Parser] Failed to clean up temporary PDF file:', cleanupError);
    }
    
    console.log(`[PDF Parser] Successfully converted ${imageBuffers.length}/${pageCount} pages to images`);
    return imageBuffers;
    
  } catch (error) {
    console.error('[PDF Parser] Error in convertPDFToImages:', error);
    throw new Error(`Failed to convert PDF pages to images: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractStepsFromPage(imageBuffer: Buffer, pageNumber: number): Promise<WorkflowStep[]> {
  try {
    if (!openai) {
      console.warn('[PDF-PARSER] OpenAI not configured, skipping AI-based step extraction');
      return [];
    }
    
    // Convert image to base64 for OpenAI Vision API
    const base64Image = imageBuffer.toString('base64');
    
    // Use OpenAI Vision to analyze the image and detect workflow steps
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert at analyzing workflow documentation images. Your task is to:
1. Identify any workflow steps or process elements in the image (numbered or unnumbered)
2. Extract content from images, screenshots, diagrams, or visual elements in order from top to bottom
3. Create meaningful titles and descriptions for each visual element or step
4. Return structured data for creating workflow blocks

Look for any process steps, screenshots, diagrams, images, or workflow elements. If there are numbered steps (like "1", "2", "3"), use those numbers. If not numbered, just process them in order from top to bottom and assign sequential numbers starting from 1.

Each step should include any screenshots, descriptions, instructions, or visual content you can identify.

Respond with JSON in this exact format:
{
  "steps": [
    {
      "stepNumber": 1,
      "title": "Descriptive title for this visual element or step",
      "description": "Detailed description of what this shows or what to do",
      "boundingBox": {
        "x": 0,
        "y": 0,
        "width": 100,
        "height": 100
      }
    }
  ]
}`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image and extract any workflow steps, process elements, screenshots, or visual content. Process them in order from top to bottom. If they're numbered, use those numbers. If not, assign sequential numbers starting from 1. For each element, provide the step number, title, description, and bounding box coordinates for cropping."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000
    });

    const result = JSON.parse(response.choices[0].message.content || '{"steps": []}');
    const steps: WorkflowStep[] = [];
    
    // Process each detected step
    for (const stepData of result.steps) {
      try {
        // Crop the image to the step's bounding box
        const croppedImage = await cropImageToStep(imageBuffer, stepData.boundingBox);
        
        steps.push({
          stepNumber: stepData.stepNumber,
          title: stepData.title,
          description: stepData.description,
          imageBase64: croppedImage.toString('base64'),
          boundingBox: stepData.boundingBox
        });
      } catch (cropError) {
        console.error("Error cropping step image:", cropError);
        // If cropping fails, use the full image
        steps.push({
          stepNumber: stepData.stepNumber,
          title: stepData.title,
          description: stepData.description,
          imageBase64: base64Image,
          boundingBox: stepData.boundingBox
        });
      }
    }
    
    return steps;
  } catch (error) {
    console.error("Error extracting steps from page:", error);
    return [];
  }
}

async function cropImageToStep(imageBuffer: Buffer, boundingBox: any): Promise<Buffer> {
  if (!boundingBox || typeof boundingBox.x !== 'number') {
    return imageBuffer; // Return original if no valid bounding box
  }
  
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    // Calculate actual pixel coordinates
    const x = Math.max(0, Math.round((boundingBox.x / 100) * (metadata.width || 1)));
    const y = Math.max(0, Math.round((boundingBox.y / 100) * (metadata.height || 1)));
    const width = Math.min(
      (metadata.width || 1) - x,
      Math.round((boundingBox.width / 100) * (metadata.width || 1))
    );
    const height = Math.min(
      (metadata.height || 1) - y,
      Math.round((boundingBox.height / 100) * (metadata.height || 1))
    );
    
    const croppedBuffer = await image
      .extract({ left: x, top: y, width, height })
      .png()
      .toBuffer();
    
    return croppedBuffer;
  } catch (error) {
    console.error("Error cropping image:", error);
    return imageBuffer;
  }
}

export async function convertWorkflowStepsToBlocks(
  steps: WorkflowStep[],
  boardId: number,
  startPhaseIndex: number = 0,
  startColumnIndex: number = 0
) {
  const blocks = [];
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const blockId = `workflow-step-${Date.now()}-${i}`;
    
    // Create attachment for the cropped image
    const attachment = {
      id: `attachment-${Date.now()}-${i}`,
      type: 'image' as const,
      url: `data:image/png;base64,${step.imageBase64}`,
      title: `Step ${step.stepNumber} Screenshot`
    };
    
    const block = {
      id: blockId,
      type: 'process' as const,
      content: step.title,
      notes: step.description,
      phaseIndex: startPhaseIndex,
      columnIndex: startColumnIndex + i,
      comments: [],
      attachments: [attachment],
      emoji: '',
      department: undefined as any,
      customDepartment: '',
      isDivider: false,
      flagged: false
    };
    
    blocks.push(block);
  }
  
  return blocks;
}