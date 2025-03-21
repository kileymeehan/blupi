import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Circle } from "lucide-react";

const COLOR_PALETTE = [
  "#FFB3B380", // Pastel Pink with 50% opacity
  "#B3FFB380", // Pastel Green with 50% opacity
  "#B3B3FF80", // Pastel Blue with 50% opacity
  "#FFE6B380", // Pastel Orange with 50% opacity
  "#E6B3FF80", // Pastel Purple with 50% opacity
  "#B3FFE680", // Pastel Mint with 50% opacity
  "#FFB3E680", // Pastel Rose with 50% opacity
  "#E6FFB380", // Pastel Lime with 50% opacity
  "#B3E6FF80", // Pastel Sky with 50% opacity
  "#FFE6E680", // Soft Pink with 50% opacity
  "#E6FFE680", // Soft Mint with 50% opacity
  "#E6E6FF80", // Soft Lavender with 50% opacity
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