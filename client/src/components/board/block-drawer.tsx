import { LAYER_TYPES } from "./constants";
import { Draggable } from "react-beautiful-dnd";
import { Separator } from "@/components/ui/separator";
import { TagManager } from "./tag-manager";

interface BlockDrawerProps {
  boardId: number;
  selectedTagId?: number;
  onTagSelect: (tagId: number | undefined) => void;
}

export default function BlockDrawer({ boardId, selectedTagId, onTagSelect }: BlockDrawerProps) {
  return (
    <div className="w-full p-4 space-y-6">
      <div>
        <h2 className="font-semibold text-gray-700 mb-3">Available Boxes</h2>
        <div className="space-y-3 flex flex-col">
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
                  className={`${layer.color} rounded-lg w-full h-[65px] relative flex items-center justify-center`}
                  style={{
                    ...provided.draggableProps.style,
                    zIndex: snapshot.isDragging ? 9999 : 'auto'
                  }}
                >
                  <div className="font-medium text-gray-700/75 text-center text-sm">
                    {layer.label}
                  </div>
                </div>
              )}
            </Draggable>
          ))}
        </div>
      </div>

      <Separator className="my-4" />

      <div>
        <TagManager 
          boardId={boardId}
          onTagSelect={onTagSelect}
          selectedTagId={selectedTagId}
        />
      </div>
    </div>
  );
}