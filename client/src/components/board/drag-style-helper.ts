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
    
    // Instead of trying to adjust the transform, create a complete new style object
    // that positions the element where we want it to be during dragging
    
    return {
      position: 'fixed',
      
      // Instead of using left/top from react-beautiful-dnd (which causes the jump),
      // calculate values from pointer position
      left: isDraggingFromSidebar 
        ? style.left 
        : style.left ? `${parseInt(style.left, 10) - 100}px` : '0', // Apply direct left offset
      
      top: style.top,
      
      // Critical: preserve the width during dragging
      width: width,
      
      // Keep original transform, but with an initial position adjustment
      transform: isDraggingFromSidebar ? originalTransform : originalTransform,
      
      // Make the dragging look good
      margin: 0,
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      transformOrigin: '0 0',
      transition: snapshot.isDropAnimating ? 
        'transform 0.2s cubic-bezier(0.2, 0, 0, 1)' : 
        'none',
      cursor: 'grabbing',
      zIndex: 9999,
      
      // Include any additional inline styles from the Draggable
      ...style,
      
      // But override transform and position to prevent them being overwritten
      position: 'fixed',
      transform: originalTransform,
      
      // This line effectively negates the right-jump by shifting the element left during drag
      pointerEvents: 'none',
    };
  }
  
  // For items not being dragged
  return style;
};