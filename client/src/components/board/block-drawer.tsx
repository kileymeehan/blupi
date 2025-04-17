import { useState, useEffect } from "react";
import { LAYER_TYPES, type LayerType } from "./constants";
import { Draggable } from "react-beautiful-dnd";
import { ColorPicker } from "@/components/color-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

export default function BlockDrawer() {
  // State for custom blocks with colors
  const [blocks, setBlocks] = useState<LayerType[]>([...LAYER_TYPES]);
  const [customBlockLabel, setCustomBlockLabel] = useState("");
  const [customBlockColor, setCustomBlockColor] = useState("#B3FFB3C0"); // Default color
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);

  // Separate standard blocks from divider blocks
  const standardBlocks = blocks.filter(layer => !layer.isDivider);
  const dividerBlocks = blocks.filter(layer => layer.isDivider);

  // Function to update a block's color
  const updateBlockColor = (type: string, newColor: string) => {
    setBlocks(prevBlocks => 
      prevBlocks.map(block => 
        block.type === type 
        ? { ...block, color: convertHexToTailwindBg(newColor) }
        : block
      )
    );
  };

  // Function to convert hex color to Tailwind bg class
  const convertHexToTailwindBg = (hex: string) => {
    // This is a simplified conversion - in real app you might want a more accurate mapping
    return `bg-[${hex}]`;
  };

  // Function to add a custom block
  const addCustomBlock = () => {
    if (!customBlockLabel.trim()) return;
    
    const newBlock: LayerType = {
      type: `custom-${Date.now()}`, // Create unique type
      label: customBlockLabel,
      color: convertHexToTailwindBg(customBlockColor),
      isCustom: true
    };
    
    setBlocks(prev => [...prev, newBlock]);
    setCustomBlockLabel("");
    setIsCustomDialogOpen(false);
  };

  return (
    <div className="w-full p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-700">Content Blocks</h2>
        <Dialog open={isCustomDialogOpen} onOpenChange={setIsCustomDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs">Add Custom</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Custom Block</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="custom-label">Block Label</Label>
                <Input 
                  id="custom-label" 
                  value={customBlockLabel} 
                  onChange={(e) => setCustomBlockLabel(e.target.value)}
                  placeholder="Enter label"
                />
              </div>
              <div className="space-y-2">
                <Label>Block Color</Label>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-10 h-10 rounded-md border border-gray-300" 
                    style={{ backgroundColor: customBlockColor }}
                  />
                  <ColorPicker 
                    color={customBlockColor}
                    onChange={setCustomBlockColor}
                    className="h-8 w-8"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCustomDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={addCustomBlock}>
                  Create Block
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
                  transition-shadow duration-200 group
                `}
                style={{
                  ...provided.draggableProps.style,
                  zIndex: snapshot.isDragging ? 9999 : 'auto',
                  cursor: snapshot.isDragging ? "grabbing" : "grab"
                }}
              >
                <div className="font-medium text-xs text-gray-700/75 text-center">
                  {layer.label}
                </div>
                
                {/* Color picker - shown on hover */}
                <div className="absolute -top-1 -right-1 hidden group-hover:block">
                  <ColorPicker
                    color={layer.color.replace('bg-[', '').replace(']', '')}
                    onChange={(newColor) => updateBlockColor(layer.type, newColor)}
                    className="h-5 w-5 shadow-sm"
                  />
                </div>
                
                {/* Delete button for custom blocks */}
                {layer.isCustom && (
                  <div className="absolute -top-1 -left-1 hidden group-hover:block">
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-5 w-5 rounded-full p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBlocks(prev => prev.filter(b => b.type !== layer.type));
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
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
                  transition-shadow duration-200 group
                `}
                style={{
                  ...provided.draggableProps.style,
                  zIndex: snapshot.isDragging ? 9999 : 'auto',
                  cursor: snapshot.isDragging ? "grabbing" : "grab"
                }}
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
                
                {/* Color picker for dividers - shown on hover */}
                <div className="absolute -top-1 -right-1 hidden group-hover:block">
                  <ColorPicker
                    color={layer.color.replace('bg-[', '').replace(']', '')}
                    onChange={(newColor) => updateBlockColor(layer.type, newColor)}
                    className="h-5 w-5 shadow-sm"
                  />
                </div>
              </div>
            )}
          </Draggable>
        ))}
      </div>
    </div>
  );
}