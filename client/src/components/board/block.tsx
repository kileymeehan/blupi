import { useRef, useEffect, KeyboardEvent } from "react";
import type { Block as BlockType } from "@shared/schema";

interface BlockProps {
  block: BlockType;
  onChange: (id: string, content: string) => void;
  isNew?: boolean;
}

export default function Block({ block, onChange, isNew = false }: BlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.textContent = block.content;
      if (isNew) {
        contentRef.current.focus();
      }
    }
  }, [block.content, isNew]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      contentRef.current?.blur();
    }
  };

  const handleBlur = () => {
    const content = contentRef.current?.textContent || '';
    if (content !== block.content) {
      onChange(block.id, content);
    }
  };

  if (isNew && !block.content) {
    return (
      <div
        ref={contentRef}
        contentEditable
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-[120px] h-[120px] rounded cursor-pointer p-2 text-sm 
          border-2 border-dashed border-gray-300 
          flex items-center justify-center text-gray-500
          hover:border-primary hover:text-primary transition-colors
          focus:outline-none focus:border-solid focus:border-primary"
        suppressContentEditableWarning={true}
      >
        Add New
      </div>
    );
  }

  return (
    <div
      ref={contentRef}
      contentEditable
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
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