import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pipette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [selectedColor, setSelectedColor] = useState(color);
  const [hexInput, setHexInput] = useState(color.replace(/C0$/, "")); // Remove opacity code for display
  const [isOpen, setIsOpen] = useState(false);
  const spectrumRef = useRef<HTMLDivElement>(null);

  // When the color prop changes from outside, update internal state
  useEffect(() => {
    setSelectedColor(color);
    setHexInput(color.replace(/C0$/, ""));
  }, [color]);

  // Handle color selection from spectrum
  const handleSpectrumClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!spectrumRef.current) return;
    
    const rect = spectrumRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left; // x position within the element
    const y = e.clientY - rect.top;  // y position within the element
    
    // Calculate color from position (simplified approach)
    const hue = Math.round((x / rect.width) * 360);
    const saturation = Math.round((y / rect.height) * 100);
    const lightness = 50; // Fixed at 50% for vibrant colors
    
    const newColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    
    // Convert HSL to HEX (rough approximation)
    const hexColor = hslToHex(hue, saturation, lightness);
    setSelectedColor(hexColor + "C0"); // Add opacity
    setHexInput(hexColor);
    onChange(hexColor + "C0");
  };

  // Convert HSL to HEX
  const hslToHex = (h: number, s: number, l: number): string => {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  // Handle hex input change
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (value.startsWith('#') && value.length <= 7) {
      setHexInput(value);
      
      // Only update the actual color when we have a valid hex code
      if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
        setSelectedColor(value + "C0"); // Add opacity
        onChange(value + "C0");
      }
    } else if (!value.startsWith('#')) {
      setHexInput('#' + value);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`p-1 h-6 w-6 rounded-full ${className}`}
          style={{ backgroundColor: selectedColor }}
        >
          <Pipette className="h-4 w-4 stroke-white" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-3">
        {/* Color Spectrum */}
        <div className="mb-3">
          <div 
            ref={spectrumRef}
            className="w-full h-32 rounded-md cursor-crosshair spectrum-gradient mb-2"
            onClick={handleSpectrumClick}
            style={{
              background: "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
              backgroundImage: "linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red), linear-gradient(to bottom, rgba(255,255,255,1), rgba(255,255,255,0), rgba(0,0,0,1))",
              backgroundBlendMode: "multiply"
            }}
          >
            <style jsx>{`
              .spectrum-gradient:before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(to bottom, white, transparent, black);
                pointer-events: none;
              }
            `}</style>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-md border border-gray-300" 
              style={{ backgroundColor: selectedColor }}
            />
            <div className="flex-1">
              <Label htmlFor="hex-color" className="sr-only">Hex Color</Label>
              <Input 
                id="hex-color"
                value={hexInput}
                onChange={handleHexChange}
                className="h-8 text-xs"
                placeholder="#RRGGBB"
              />
            </div>
          </div>
        </div>
        
        {/* Color Palette */}
        <div>
          <Label className="text-xs mb-1 block text-muted-foreground">Color Presets</Label>
          <div className="grid grid-cols-6 gap-1">
            {COLOR_PALETTE.map((paletteColor) => (
              <button
                key={paletteColor}
                className="h-6 w-6 rounded-md transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary"
                style={{ backgroundColor: paletteColor }}
                onClick={() => {
                  setSelectedColor(paletteColor);
                  setHexInput(paletteColor.replace(/C0$/, ""));
                  onChange(paletteColor);
                  setIsOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}