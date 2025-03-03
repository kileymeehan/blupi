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

  return (
    <div
      ref={contentRef}
      contentEditable
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`w-[120px] h-[120px] rounded cursor-pointer p-2 text-sm 
        ${!block.content ? 'border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500' : 'border border-transparent hover:border-gray-300'} 
        transition-colors focus:outline-none focus:border-solid focus:border-primary`}
      style={{ backgroundColor: 'inherit' }}
      suppressContentEditableWarning={true}
    >
      {block.content || "Add New"}
    </div>
  );
}