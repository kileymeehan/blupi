import { LAYER_TYPES } from "./board-grid";
import { Draggable } from "react-beautiful-dnd";
import Block from "./block";
import { nanoid } from "nanoid";

export default function BlockDrawer() {
  // Skip the touchpoint type as it's added by default
  const blockTypes = LAYER_TYPES.filter(type => type.type !== 'touchpoint');
  
  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4">
      <h3 className="font-medium text-sm mb-4">Available Blocks</h3>
      <div className="space-y-4">
        {blockTypes.map((layer, index) => (
          <Draggable
            key={layer.type}
            draggableId={`drawer-${layer.type}`}
            index={index}
          >
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                className={`${layer.color} rounded-lg`}
              >
                <Block
                  block={{
                    id: nanoid(),
                    type: layer.type,
                    content: '',
                    phaseIndex: -1,
                    columnIndex: -1
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
