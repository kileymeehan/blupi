import { LAYER_TYPES } from "./board-grid";
import { Draggable } from "react-beautiful-dnd";
import Block from "./block";

export default function BlockDrawer() {
  // Skip the touchpoint type as it's added by default
  const blockTypes = LAYER_TYPES.filter(type => type.type !== 'touchpoint');

  return (
    <div className="w-64 bg-white p-4">
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
                className={`${layer.color} rounded-lg w-[100px] h-[100px]`}
              >
                <Block
                  block={{
                    id: `drawer-${layer.type}`,
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