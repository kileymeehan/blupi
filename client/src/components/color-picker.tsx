import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Circle } from "lucide-react";

const COLOR_PALETTE = [
  "#FFB3B3", // Pastel Pink
  "#B3FFB3", // Pastel Green
  "#B3B3FF", // Pastel Blue
  "#FFE6B3", // Pastel Orange
  "#E6B3FF", // Pastel Purple
  "#B3FFE6", // Pastel Mint
  "#FFB3E6", // Pastel Rose
  "#E6FFB3", // Pastel Lime
  "#B3E6FF", // Pastel Sky
  "#FFE6E6", // Soft Pink
  "#E6FFE6", // Soft Mint
  "#E6E6FF", // Soft Lavender
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