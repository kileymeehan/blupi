import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Circle } from "lucide-react";

const COLOR_PALETTE = [
  "#FFB3B3C0", // Pastel Pink with 75% opacity
  "#B3FFB3C0", // Pastel Green with 75% opacity
  "#B3B3FFC0", // Pastel Blue with 75% opacity
  "#FFE6B3C0", // Pastel Orange with 75% opacity
  "#E6B3FFC0", // Pastel Purple with 75% opacity
  "#B3FFE6C0", // Pastel Mint with 75% opacity
  "#FFB3E6C0", // Pastel Rose with 75% opacity
  "#E6FFB3C0", // Pastel Lime with 75% opacity
  "#B3E6FFC0", // Pastel Sky with 75% opacity
  "#FFE6E6C0", // Soft Pink with 75% opacity
  "#E6FFE6C0", // Soft Mint with 75% opacity
  "#E6E6FFC0", // Soft Lavender with 75% opacity
];

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  className?: string;
}

export function ColorPicker({ color, onChange, className }: ColorPickerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`p-1 h-6 w-6 rounded-full ${className}`}
          style={{ backgroundColor: color }}
        >
          <Circle className="h-4 w-4 stroke-white" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32 p-2">
        <div className="grid grid-cols-4 gap-1">
          {COLOR_PALETTE.map((paletteColor) => (
            <button
              key={paletteColor}
              className="h-6 w-6 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary"
              style={{ backgroundColor: paletteColor }}
              onClick={() => onChange(paletteColor)}
            />
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}