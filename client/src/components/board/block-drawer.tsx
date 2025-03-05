import { LAYER_TYPES } from "./board-grid";
import { Draggable } from "react-beautiful-dnd";
import Block from "./block";

export default function BlockDrawer() {
  // Skip the touchpoint type as it's added by default
  const blockTypes = LAYER_TYPES.filter(type => type.type !== 'touchpoint');

  return (
    <div className="w-full p-4">
      <div className="flex items-center mb-4">
        <h2 className="font-semibold text-gray-700">Available Boxes</h2>
      </div>
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
                className={`${layer.color} rounded-lg w-[205px] h-[100px] relative flex items-center justify-center`}
                style={{
                  ...provided.draggableProps.style,
                  zIndex: snapshot.isDragging ? 9999 : 'auto'
                }}
              >
                <div className="font-bold text-gray-700/75 text-center">
                  {layer.label}
                </div>
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