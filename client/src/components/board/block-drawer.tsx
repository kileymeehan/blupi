import { LAYER_TYPES } from "./constants";
import { Draggable } from "react-beautiful-dnd";

export default function BlockDrawer() {
  return (
    <div className="w-full p-4">
      <div className="mb-4">
        <h2 className="font-semibold text-gray-700">Available Boxes</h2>
      </div>
      <div className="space-y-4 flex flex-col">
        {LAYER_TYPES.map((layer, index) => (
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
                className={`${layer.color} rounded-lg w-full h-[75px] relative flex items-center justify-center`}
                style={{
                  ...provided.draggableProps.style,
                  zIndex: snapshot.isDragging ? 9999 : 'auto'
                }}
              >
                <div className="font-bold text-gray-700/75 text-center text-sm">
                  {layer.label}
                </div>
              </div>
            )}
          </Draggable>
        ))}
      </div>
    </div>
  );
}