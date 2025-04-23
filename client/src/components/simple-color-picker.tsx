import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";

const COLOR_PALETTE = [
  "#FFB3B3C0", // Pastel Pink with 75% opacity
  "#B3FFB3C0", // Pastel Green with 75% opacity
  "#B3B3FFC0", // Pastel Blue with 75% opacity
  "#FFE6B3C0", // Pastel Orange with 75% opacity
  "#E6B3FFC0", // Pastel Purple with 75% opacity
  "#B3FFE6C0", // Pastel Mint with 75% opacity
];

interface SimpleColorPickerProps {
  onChange: (color: string) => void;
  className?: string;
}

export function SimpleColorPicker({ onChange, className }: SimpleColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className={`p-1 h-6 w-6 rounded ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <Palette className="h-4 w-4" />
      </Button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white shadow-md rounded-md p-2 z-50">
          <div className="grid grid-cols-3 gap-1 w-[90px]">
            {COLOR_PALETTE.map(color => (
              <button
                key={color}
                className="w-6 h-6 rounded-full border border-gray-200 transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(color);
                  setIsOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}