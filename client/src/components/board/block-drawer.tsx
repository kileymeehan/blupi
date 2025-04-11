import { LAYER_TYPES } from "./constants";
import { Draggable } from "react-beautiful-dnd";

// Helper function for consistent drag behavior
const getStyle = (style: any, snapshot: any, sourceIndex?: string) => {
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

export default function BlockDrawer() {
  // Separate standard blocks from divider blocks
  const standardBlocks = LAYER_TYPES.filter(layer => !layer.isDivider);
  const dividerBlocks = LAYER_TYPES.filter(layer => layer.isDivider);

  return (
    <div className="w-full p-4">
      <div className="flex items-center mb-4">
        <h2 className="font-semibold text-gray-700">Content Blocks</h2>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-8">
        {standardBlocks.map((layer, index) => (
          <Draggable
            key={layer.type}
            draggableId={`drawer-${layer.type}`}
            index={index}
          >
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                className={`${layer.color} rounded-lg w-[100px] h-[50px] relative flex items-center justify-center
                  ${snapshot.isDragging ? "shadow-xl" : "hover:shadow-md"}
                  transition-shadow duration-200
                `}
                style={getStyle({
                  ...provided.draggableProps.style,
                  zIndex: snapshot.isDragging ? 9999 : 'auto',
                  cursor: snapshot.isDragging ? "grabbing" : "grab"
                }, snapshot, "drawer")}
              >
                <div className="font-medium text-xs text-gray-700/75 text-center">
                  {layer.label}
                </div>
              </div>
            )}
          </Draggable>
        ))}
      </div>

      {/* Divider blocks section */}
      <div className="flex items-center mb-4 mt-6">
        <h2 className="font-semibold text-gray-700">Stage Dividers</h2>
      </div>
      
      <div className="space-y-4 flex flex-col items-center">
        {dividerBlocks.map((layer, index) => (
          <Draggable
            key={layer.type}
            draggableId={`drawer-${layer.type}`}
            index={standardBlocks.length + index}
          >
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                className={`${layer.color} rounded-lg w-[205px] h-[40px] relative flex items-center justify-center border-2 border-white text-white
                  ${snapshot.isDragging ? "shadow-xl" : "hover:shadow-md"}
                  transition-shadow duration-200
                `}
                style={getStyle({
                  ...provided.draggableProps.style,
                  zIndex: snapshot.isDragging ? 9999 : 'auto',
                  cursor: snapshot.isDragging ? "grabbing" : "grab"
                }, snapshot, "drawer")}
              >
                <div className="absolute inset-0 flex items-center justify-start px-4 pointer-events-none">
                  <div className="w-full border-t-2 border-white opacity-50"></div>
                </div>
                
                <div className="relative z-10 px-4 bg-inherit rounded-md font-semibold">
                  {layer.label}
                </div>
                
                <div className="absolute inset-0 flex items-center justify-end px-4 pointer-events-none">
                  <div className="w-full border-t-2 border-white opacity-50"></div>
                </div>
              </div>
            )}
          </Draggable>
        ))}
      </div>
    </div>
  );
}