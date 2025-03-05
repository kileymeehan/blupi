import { LAYER_TYPES } from "./board-grid";
import { Draggable } from "react-beautiful-dnd";
import Block from "./block";

export default function BlockDrawer() {
  // Skip the touchpoint type as it's added by default
  const blockTypes = LAYER_TYPES.filter(type => type.type !== 'touchpoint');

  return (
    <div className="w-full p-4">
      <h3 className="text-sm font-medium text-center mb-4 text-muted-foreground">
        Available Boxes
      </h3>
      <div className="space-y-4 flex flex-col items-center">
        {blockTypes.map((layer, index) => (
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
                className={`${layer.color} rounded-lg w-[205px] h-[100px] relative`}
                style={{
                  ...provided.draggableProps.style,
                  zIndex: snapshot.isDragging ? 9999 : 'auto'
                }}
              >
                <Block
                  block={{
                    id: `drawer-${layer.type}`,
                    type: layer.type,
                    content: '',
                    phaseIndex: -1,
                    columnIndex: -1,
                    comments: []
                  }}
                  isTemplate
                />
              </div>
            )}
          </Draggable>
        ))}
      </div>
    </div>
  );
}