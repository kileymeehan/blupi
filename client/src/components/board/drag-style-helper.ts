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
    
    // Extract transform values if present
    let translateX = 0;
    let translateY = 0;
    
    if (style.transform) {
      const match = style.transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
      if (match && match.length >= 3) {
        translateX = parseInt(match[1], 10) || 0;
        translateY = parseInt(match[2], 10) || 0;
      }
    }
    
    // For dragging from columns, use a combination of approaches
    if (!isDraggingFromSidebar) {
      // Get client rect data from drag handle, if possible
      const dragHandles = document.querySelectorAll('[data-drag-handle="true"]');
      const activeHandles = Array.from(dragHandles).filter(handle => 
        window.getComputedStyle(handle).cursor === 'grabbing'
      );
      
      // Adjust position by taking into account where the drag handle is relative to the block
      // We only need a very minor offset to prevent block jumping
      const offsetX = -10; 
      const offsetY = -10;
      
      // Set a fixed position based on style.left and style.top from react-beautiful-dnd
      return {
        ...style,
        position: 'fixed',
        top: style.top,
        left: style.left ? `${parseInt(style.left, 10) + offsetX}px` : `${offsetX}px`,
        width: width,
        height: 'auto',
        margin: 0,
        transform: style.transform, // Keep original transform
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