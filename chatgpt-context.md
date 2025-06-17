# Image Attachment System Bug Report

## Problem Summary
The image attachment button in blocks works (opens dialog), and the image upload dialog processes images correctly, but uploaded images don't persist to the block's attachments array. The chain breaks somewhere between the dialog's `onImagesChange` callback and the block state update.

## Context
- Using React with TypeScript
- Drag/drop system for blocks using react-beautiful-dnd
- Image attachments stored as base64 data URLs in block.attachments array
- Dialog opens correctly, processes images, but they don't save to the block

## Key Files

### 1. Block Component (client/src/components/board/block.tsx)
**Key sections:**

```typescript
// Block props interface
interface BlockProps {
  block: BlockType & { readOnly?: boolean };
  boardId: number;
  onChange?: (content: string, newType?: string) => void;
  onAttachmentChange?: (id: string, attachments: Attachment[]) => void;
  // ... other props
}

// Image button that opens dialog
<button
  onClick={() => {
    console.log('[Block] === IMAGE BUTTON CLICKED ===');
    console.log('[Block] Block ID:', block.id);
    setAttachmentDialogOpen(true);
  }}
  className="flex items-center justify-center w-6 h-6 p-0 rounded bg-white border border-gray-200"
>
  <ImageIcon className="w-4 h-4" />
</button>

// Dialog component with callback
<ImageAttachmentDialog
  open={attachmentDialogOpen}
  onOpenChange={setAttachmentDialogOpen}
  currentImages={safeAttachments}
  onImagesChange={(images) => {
    console.log('[Block] onImagesChange called with:', images);
    console.log('[Block] onAttachmentChange function exists:', !!onAttachmentChange);
    if (onAttachmentChange) {
      console.log('[Block] Calling onAttachmentChange...');
      onAttachmentChange(block.id, images);
      console.log('[Block] onAttachmentChange called successfully');
    } else {
      console.error('[Block] onAttachmentChange is undefined!');
    }
  }}
/>

// Safe attachments processing
const safeAttachments = (() => {
  console.log(`[Block ${block.id}] Processing attachments. Raw data:`, block.attachments);
  
  if (!block.attachments) {
    console.log(`[Block ${block.id}] No attachments found`);
    return [];
  }

  // Handle both string and array formats
  let rawAttachments: any[] = [];
  if (typeof block.attachments === 'string') {
    try {
      rawAttachments = JSON.parse(block.attachments);
    } catch (e) {
      console.error(`[Block ${block.id}] Failed to parse attachments string:`, e);
      return [];
    }
  } else if (Array.isArray(block.attachments)) {
    rawAttachments = block.attachments;
  }

  // Filter and validate attachments
  const uniqueAttachments = rawAttachments.reduce((acc, attachment) => {
    if (attachment?.id && attachment?.type && attachment?.url) {
      acc.push(attachment);
    }
    return acc;
  }, [] as Attachment[]);
  
  return uniqueAttachments;
})();
```

### 2. Image Attachment Dialog (client/src/components/board/image-attachment-dialog.tsx)
**Key sections:**

```typescript
interface ImageAttachmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentImages: Attachment[];
  onImagesChange: (images: Attachment[]) => void;
}

const handleImageUpload = async (file: File) => {
  console.log('[ImageDialog] === UPLOAD STARTED ===');
  console.log('[ImageDialog] Current images before upload:', currentImages);
  
  try {
    setIsUploading(true);
    const compressedImage = await compressImage(file);
    
    // Create new attachment object
    const newAttachment: Attachment = {
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'image',
      url: compressedImage,
      title: file.name,
    };
    
    console.log('[ImageDialog] New attachment created:', newAttachment);
    
    // Add to existing images
    const updatedImages = [...currentImages, newAttachment];
    console.log('[ImageDialog] Updated images array:', updatedImages);
    console.log('[ImageDialog] Calling onImagesChange with', updatedImages.length, 'images');
    
    onImagesChange(updatedImages);
    console.log('[ImageDialog] onImagesChange called successfully');
    
  } catch (error) {
    console.error("Image upload error:", error);
  } finally {
    setIsUploading(false);
  }
};
```

## Current Console Output When Uploading Images
```
[Block] === IMAGE BUTTON CLICKED ===
[Block] Block ID: [some-id]
[Block] Setting attachmentDialogOpen to true
[ImageDialog] Component rendered, open: false
[ImageDialog] Current images: []
[Block] Processing attachments. Raw data: []
[Block] Found 0 raw attachments
[Block] Found 0 valid attachments
[Block] Final safe attachments: []
```

**When uploading an image:**
```
[ImageDialog] === UPLOAD STARTED ===
[ImageDialog] Current images before upload: []
[ImageDialog] New attachment created: {id: "img_...", type: "image", url: "data:image/jpeg;base64,...", title: "image.jpg"}
[ImageDialog] Updated images array: [attachment object]
[ImageDialog] Calling onImagesChange with 1 images
[ImageDialog] onImagesChange called successfully
```

**Missing logs:** No "[Block] onImagesChange called with:" logs appear after the dialog's onImagesChange call.

## Schema Type (shared/schema.ts)
```typescript
export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'link';
  url: string;
  title?: string;
}
```

## Questions for Analysis
1. Why isn't the Block component's onImagesChange callback being triggered when the dialog calls it?
2. Is there a React rendering/state issue preventing the callback from executing?
3. Could the drag/drop system be interfering with the callback chain?
4. Are there any obvious issues with the callback structure or prop passing?

## Expected Behavior
When an image is uploaded in the dialog:
1. Dialog creates attachment object ✅ (working)
2. Dialog calls onImagesChange(updatedImages) ✅ (working) 
3. Block receives callback and calls onAttachmentChange ❌ (not happening)
4. Parent component updates block.attachments ❌ (not happening)
5. Block re-renders with new attachments ❌ (not happening)

The break is between steps 2 and 3 - the dialog's callback isn't reaching the block component.