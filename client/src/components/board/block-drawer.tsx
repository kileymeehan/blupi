import { LAYER_TYPES } from "./constants";
import { Draggable } from "@hello-pangea/dnd";
import * as Icons from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BlockDrawerProps {
  darkMode?: boolean;
}

export default function BlockDrawer({ darkMode = false }: BlockDrawerProps) {
  // Separate standard blocks from divider blocks
  const standardBlocks = LAYER_TYPES.filter(layer => !layer.isDivider);
  const dividerBlocks = LAYER_TYPES.filter(layer => layer.isDivider);

  // Dynamic icon rendering function
  const renderIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || Icons.Square;
    return <IconComponent className="w-3.5 h-3.5 mr-0.5" style={{ color: darkMode ? '#e2e8f0' : '#111827' }} />;
  };

  return (
    <div className="w-full p-4">
      <div className="flex items-center mb-4">
        <h2 
          className="font-black uppercase tracking-widest text-xs"
          style={{ color: darkMode ? '#FFFFFF' : '#0A0A0F' }}
        >
          Content Blocks
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
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
                className={`${layer.color} border-2 border-[#0A0A0F] rounded-none w-full min-w-[100px] h-[52px] relative flex items-center justify-center
                  shadow-[2px_2px_0px_0px_#0A0A0F] hover:bg-[#FFD600]
                  ${snapshot.isDragging ? "shadow-[4px_4px_0px_0px_#0A0A0F]" : ""}
                  transition-all duration-200
                `}
                style={{
                  ...provided.draggableProps.style,
                  zIndex: snapshot.isDragging ? 9999 : 'auto',
                  cursor: snapshot.isDragging ? "grabbing" : "grab"
                }}
              >
                <div className="font-black text-[9px] uppercase tracking-wide text-[#0A0A0F] text-center flex flex-col items-center justify-center px-1">
                  {renderIcon(layer.icon)}
                  <span className="mt-1 leading-tight whitespace-nowrap">{layer.label}</span>
                </div>
              </div>
            )}
          </Draggable>
        ))}
      </div>

      {/* Divider blocks section */}
      <div className="flex items-center mb-4 mt-6 justify-start">
        <h2 
          className="font-black uppercase tracking-widest text-xs"
          style={{ color: darkMode ? '#FFFFFF' : '#0A0A0F' }}
        >
          Stage Dividers
        </h2>
      </div>
      
      <div className="grid grid-cols-1 gap-3">
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
                className={`${layer.color} border-2 border-[#0A0A0F] rounded-none w-full h-[48px] relative flex items-center justify-center text-white
                  shadow-[2px_2px_0px_0px_#0A0A0F] hover:bg-[#FFD600] hover:text-[#0A0A0F]
                  ${snapshot.isDragging ? "shadow-[4px_4px_0px_0px_#0A0A0F]" : ""}
                  transition-all duration-200
                `}
                style={{
                  ...provided.draggableProps.style,
                  zIndex: snapshot.isDragging ? 9999 : 'auto',
                  cursor: snapshot.isDragging ? "grabbing" : "grab"
                }}
              >
                <div className="font-black text-[10px] text-white text-center flex items-center justify-center uppercase tracking-wide">
                  {renderIcon(layer.icon)}
                  <span className="ml-2">{layer.label}</span>
                </div>
              </div>
            )}
          </Draggable>
        ))}
      </div>
    </div>
  );
}