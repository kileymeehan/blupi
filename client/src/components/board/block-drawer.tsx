import { LAYER_TYPES } from "./constants";
import { Draggable } from "@hello-pangea/dnd";
import * as Icons from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function BlockDrawer() {
  // Separate standard blocks from divider blocks
  const standardBlocks = LAYER_TYPES.filter(layer => !layer.isDivider);
  const dividerBlocks = LAYER_TYPES.filter(layer => layer.isDivider);

  // Dynamic icon rendering function
  const renderIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || Icons.Square;
    return <IconComponent className="w-3.5 h-3.5 mr-0.5 text-gray-900" />;
  };

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
                className={`${layer.color} rounded-lg w-[90px] h-[40px] relative flex items-center justify-center
                  ${snapshot.isDragging ? "shadow-xl" : "hover:shadow-md"}
                  transition-shadow duration-200
                `}
                style={{
                  ...provided.draggableProps.style,
                  zIndex: snapshot.isDragging ? 9999 : 'auto',
                  cursor: snapshot.isDragging ? "grabbing" : "grab"
                }}
              >
                <div className="font-semibold text-[10px] text-gray-900 text-center flex flex-col items-center justify-center">
                  {renderIcon(layer.icon)}
                  <span className="mt-0.5 tracking-wide">{layer.label}</span>
                </div>
              </div>
            )}
          </Draggable>
        ))}
      </div>

      {/* Divider blocks section */}
      <div className="flex items-center mb-4 mt-6 justify-start">
        <h2 className="font-semibold text-gray-700">Stage Dividers</h2>
      </div>
      
      <div className="grid grid-cols-1 gap-2">
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
                className={`${layer.color} rounded-lg w-full h-[40px] relative flex items-center justify-center text-white
                  ${snapshot.isDragging ? "shadow-xl" : "hover:shadow-md"}
                  transition-shadow duration-200
                `}
                style={{
                  ...provided.draggableProps.style,
                  zIndex: snapshot.isDragging ? 9999 : 'auto',
                  cursor: snapshot.isDragging ? "grabbing" : "grab"
                }}
              >
                <div className="font-semibold text-[10px] text-white text-center flex items-center justify-center">
                  {renderIcon(layer.icon)}
                  <span className="ml-0.5 tracking-wide">{layer.label}</span>
                </div>
              </div>
            )}
          </Draggable>
        ))}
      </div>
    </div>
  );
}