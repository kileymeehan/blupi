// Helper function to improve drag and drop positioning
export const getDragStyle = (style: any, snapshot: any, sourceIndex?: string) => {
  if (!style || !snapshot) {
    return style;
  }
  
  // When the item is being dragged
  if (snapshot.isDragging) {
    // Different handling for dragging within grid vs from sidebar
    const isDraggingFromSidebar = sourceIndex === "drawer";
    
    // Calculate initial width - critical to preventing width changes during drag
    let width = style.width;
    
    // If style.width is not defined, get width from the element itself
    // This prevents the width from changing during the drag operation
    if (!isDraggingFromSidebar && !width) {
      // Make sure we maintain the original width of column-spanning blocks
      if (style.gridColumn && style.gridColumn.startsWith('span')) {
        // Keep the explicitly set width from the original element
        width = style.width;
      } else {
        // Default width for standard blocks
        width = '225px';
      }
    }
    
    // Store original transform values for reference
    const originalTransform = style.transform;
    
    // Start with the original style as a base
    const newStyle = { ...style };
    
    // Apply our custom styles specifically for dragging
    newStyle.position = 'fixed';
    
    // Apply left offset to compensate for the jumping issue
    if (!isDraggingFromSidebar && style.left) {
      newStyle.left = `${parseInt(style.left, 10) - 100}px`;
    }
    
    // Make sure width is preserved
    newStyle.width = width;
    
    // Other visual styling
    newStyle.margin = 0;
    newStyle.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
    newStyle.transformOrigin = '0 0';
    newStyle.transition = snapshot.isDropAnimating ? 
      'transform 0.2s cubic-bezier(0.2, 0, 0, 1)' : 
      'none';
    newStyle.cursor = 'grabbing';
    newStyle.zIndex = 9999;
    
    return newStyle;
  }
  
  // For items not being dragged
  return style;
};