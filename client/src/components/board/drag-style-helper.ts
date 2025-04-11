// Helper function to improve drag and drop positioning
export const getDragStyle = (style: any, snapshot: any, sourceIndex?: string) => {
  if (!style || !snapshot) {
    return style;
  }
  
  // When the item is being dragged
  if (snapshot.isDragging) {
    // Different handling for dragging within grid vs from sidebar
    const isDraggingFromSidebar = sourceIndex === "drawer";
    
    return {
      ...style,
      transform: style.transform,
      // Force a fixed position for accurate cursor tracking
      position: 'fixed',
      // Attach the cursor to the exact position of the grab
      left: style.left,
      top: style.top,
      // Other common dragging properties
      margin: 0,
      width: isDraggingFromSidebar ? style.width : undefined,
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