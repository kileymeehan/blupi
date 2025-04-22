import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const [selectedColor, setSelectedColor] = useState(color || "#B3FFB3C0");
  const [hexInput, setHexInput] = useState((color || "#B3FFB3C0").replace(/C0$/, "")); // Remove opacity code for display
  const [isOpen, setIsOpen] = useState(false);
  const spectrumRef = useRef<HTMLDivElement>(null);

  // When the color prop changes from outside, update internal state
  useEffect(() => {
    if (color) {
      setSelectedColor(color);
      setHexInput(color.replace(/C0$/, ""));
    }
  }, [color]);

  // Completely rewritten color spectrum calculation with improved color range
  const handleSpectrumClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!spectrumRef.current) return;
    
    const rect = spectrumRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left)); // x position within the element, clamped
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));  // y position within the element, clamped
    
    // Map x coordinate to hue (0-360 degrees)
    const hue = Math.round((x / rect.width) * 360);
    
    // Top = white, Bottom right = saturated colors, Bottom left = black
    // Calculate saturation and value (brightness) based on y position and hue
    const saturation = Math.min(100, Math.round((y / rect.height) * 100));
    const value = Math.max(0, Math.min(100, 100 - Math.round((y / rect.height) * (100 - 20)))); // Ranges from 100% (top) to 20% (bottom)
    
    // Convert HSV to RGB directly (improved algorithm for better colors)
    const hi = Math.floor(hue / 60) % 6;
    const f = (hue / 60) - hi;
    const v = value / 100;
    const s = saturation / 100;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    
    let r, g, b;
    switch (hi) {
      case 0: [r, g, b] = [v, t, p]; break;
      case 1: [r, g, b] = [q, v, p]; break;
      case 2: [r, g, b] = [p, v, t]; break;
      case 3: [r, g, b] = [p, q, v]; break;
      case 4: [r, g, b] = [t, p, v]; break;
      case 5: [r, g, b] = [v, p, q]; break;
      default: [r, g, b] = [0, 0, 0]; // Should never happen
    }
    
    // Convert RGB to hex
    const toHex = (value: number) => {
      const hex = Math.round(value * 255).toString(16).padStart(2, '0');
      return hex;
    };
    
    const hexColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    console.log(`Selected color at x=${x}, y=${y}, hue=${hue}, sat=${saturation}, val=${value}: ${hexColor}`);
    
    // Validate the hex color to make sure it's properly formatted
    if (/^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
      const newColor = hexColor + "C0"; // Add opacity
      
      setSelectedColor(newColor);
      setHexInput(hexColor);
      onChange(newColor);
    }
  };

  // Improved HSL to HEX conversion
  const hslToHex = (h: number, s: number, l: number): string => {
    // Ensure parameters are within valid ranges
    h = Math.max(0, Math.min(360, h));
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;
    
    // When s=0, it's a shade of gray (no hue)
    if (s === 0) {
      const channel = Math.round(l * 255);
      const hex = channel.toString(16).padStart(2, '0');
      return `#${hex}${hex}${hex}`;
    }
    
    // Formula to convert HSL to RGB
    const chroma = (1 - Math.abs(2 * l - 1)) * s;
    const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - chroma / 2;
    
    let r = 0, g = 0, b = 0;
    
    if (h < 60) {
      r = chroma; g = x; b = 0;
    } else if (h < 120) {
      r = x; g = chroma; b = 0;
    } else if (h < 180) {
      r = 0; g = chroma; b = x;
    } else if (h < 240) {
      r = 0; g = x; b = chroma;
    } else if (h < 300) {
      r = x; g = 0; b = chroma;
    } else {
      r = chroma; g = 0; b = x;
    }
    
    // Convert to 8-bit channels and hexadecimal
    const toHex = (val: number) => {
      const hex = Math.round((val + m) * 255).toString(16).padStart(2, '0');
      return hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Handle hex input change
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (value.startsWith('#') && value.length <= 7) {
      setHexInput(value);
      
      // Only update the actual color when we have a valid hex code
      if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
        const newColor = value + "C0"; // Add opacity
        setSelectedColor(newColor);
        onChange(newColor);
      }
    } else if (!value.startsWith('#')) {
      setHexInput('#' + value);
    }
  };

  // Prevent tooltip from closing when clicking inside
  const handleTooltipInteraction = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Close the color picker only when explicitly requested
  const handleOpenChange = (open: boolean) => {
    // If it's trying to close and we're not explicitly closing it, keep it open
    if (!open && isOpen) {
      // Don't do anything - this prevents the tooltip from closing
      // when the mouse accidentally moves outside
      return;
    }
    setIsOpen(open);
  };

  // Handle click outside for closing the tooltip
  useEffect(() => {
    // Only add event listener if the tooltip is open
    if (isOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        // Check if the click is outside the color picker dialog
        if (spectrumRef.current && !spectrumRef.current.contains(e.target as Node)) {
          // Close the tooltip if the click is outside the color picker
          if (!(e.target as Element)?.closest('.color-picker-content')) {
            setIsOpen(false);
          }
        }
      };
      
      // Add click event listener to the document
      document.addEventListener('mousedown', handleClickOutside);
      
      // Clean up the event listener
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);
  
  return (
    <TooltipProvider>
      <Tooltip 
        open={isOpen} 
        // Only allow opening via explicit click, not hover
        // and always allow closing (when clicking outside)
        onOpenChange={(open) => {
          if (!open) {
            setIsOpen(false);
          }
        }}
      >
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`p-1 h-6 w-6 rounded-full ${className} transition-all duration-150 hover:scale-110 relative`}
            style={{ backgroundColor: selectedColor }}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(prev => !prev); // Toggle open state on click
            }}
          >
            <Pipette 
              className={`h-4 w-4 stroke-white transition-all duration-300 ${isOpen ? 'rotate-12 scale-110' : ''}`} 
            />
            {/* Add a subtle "click me" indicator */}
            {!isOpen && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          align="center" 
          className="w-64 p-3 z-50 color-picker-content" 
          sideOffset={5}
          onClick={(e) => {
            // Prevent clicks inside from bubbling to document
            e.stopPropagation();
          }}
        >
          <div className="relative">
            {/* Close button */}
            <button 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
            
            {/* Color Spectrum */}
            <div className="mb-3 mt-2">
              <div 
                ref={spectrumRef}
                className="w-full h-24 rounded-md cursor-crosshair mb-2 relative overflow-hidden"
                onClick={handleSpectrumClick}
              >
                {/* Base hue gradient (horizontal) */}
                <div 
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
                  }}
                />
                
                {/* White to transparent gradient (vertical from top) */}
                <div 
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(to bottom, white, transparent)",
                  }}
                />
                
                {/* Transparent to black gradient (vertical from bottom) */}
                <div 
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(to bottom, transparent, black)",
                  }}
                />
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
                      const newColor = paletteColor;
                      setSelectedColor(newColor);
                      setHexInput(paletteColor.replace(/C0$/, ""));
                      onChange(newColor);
                      setIsOpen(false);
                    }}
                  />
                ))}
              </div>
            </div>
            
            {/* Done button */}
            <div className="mt-3 flex justify-end">
              <Button 
                size="sm" 
                className="text-xs h-7"
                onClick={() => setIsOpen(false)}
              >
                Apply
              </Button>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}