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
    
    // Calculate transform offset to prevent the jumping effect
    // The jump happens because the cursor position within the element changes
    // We need to add an offset to keep the cursor at the same relative position
    const transform = style.transform;
    
    return {
      ...style,
      transform: transform,
      // Force a fixed position for accurate cursor tracking
      position: 'fixed',
      // Attach the cursor to the exact position of the grab
      left: style.left,
      top: style.top,
      // Critical: preserve the width during dragging
      width: width,
      // Other common dragging properties
      margin: 0,
      transformOrigin: '0 0',
      transition: snapshot.isDropAnimating ? 
        'transform 0.2s cubic-bezier(0.2, 0, 0, 1)' : 
        'none',
      cursor: 'grabbing',
      zIndex: 9999
    };
  }
  
  // For items not being dragged
  return style;
};