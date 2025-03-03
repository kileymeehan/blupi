import { useRef, useEffect } from "react";
import type { Block as BlockType } from "@shared/schema";

interface BlockProps {
  block: BlockType;
  onChange: (id: string, content: string) => void;
}

export default function Block({ block, onChange }: BlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.textContent = block.content;
    }
  }, [block.content]);

  const handleBlur = () => {
    const content = contentRef.current?.textContent || '';
    if (content !== block.content) {
      onChange(block.id, content);
    }
  };

  return (
    <div
      ref={contentRef}
      contentEditable
      onBlur={handleBlur}
      className="w-[120px] h-[120px] rounded shadow-sm cursor-pointer p-2 text-sm overflow-y-auto 
        border border-transparent hover:border-gray-300 transition-colors
        focus:outline-none focus:border-primary ring-offset-background
        placeholder:text-muted-foreground"
      style={{ backgroundColor: 'inherit' }}
      suppressContentEditableWarning={true}
    >
      {block.content || "Click to add content"}
    </div>
  );
}