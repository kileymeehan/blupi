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
    
    // For dragging from columns
    if (!isDraggingFromSidebar) {
      return {
        ...style,
        position: 'fixed',
        top: style.top,
        left: style.left,
        width: width,
        height: 'auto',
        margin: 0,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        cursor: 'grabbing',
        zIndex: 9999,
        // Smooth animation only when dropping
        transition: snapshot.isDropAnimating ? 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)' : 'none',
      };
    } 
    
    // For dragging from sidebar, use the default positioning
    return {
      ...style,
      position: 'fixed',
      width: width,
      margin: 0,
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      cursor: 'grabbing',
      zIndex: 9999,
      transition: snapshot.isDropAnimating ? 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)' : 'none',
    };
  }
  
  // For items not being dragged
  return style;
};