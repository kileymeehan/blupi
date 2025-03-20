import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Circle } from "lucide-react";

const COLOR_PALETTE = [
  "#FF5733", // Orange Red
  "#33FF57", // Lime Green
  "#3357FF", // Royal Blue
  "#FF33F5", // Pink
  "#33FFF5", // Cyan
  "#F5FF33", // Yellow
  "#FF3333", // Red
  "#33FF33", // Green
  "#4F46E5", // Indigo
  "#22C55E", // Emerald
  "#EF4444", // Rose
  "#EC4899", // Fuchsia
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
