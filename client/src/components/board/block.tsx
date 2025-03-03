import { useRef, useEffect, KeyboardEvent } from "react";
import type { Block as BlockType } from "@shared/schema";

interface BlockProps {
  block: BlockType;
  onChange?: (id: string, content: string) => void;
  isTemplate?: boolean;
}

const TYPE_LABELS = {
  touchpoint: 'Touchpoint',
  role: 'Role',
  process: 'Process',
  pitfall: 'Pitfall',
  policy: 'Policy',
  technology: 'Technology',
  rationale: 'Rationale',
  question: 'Question',
  note: 'Note'
} as const;

export default function Block({ block, onChange, isTemplate = false }: BlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current && !isTemplate) {
      contentRef.current.textContent = block.content;
    }
  }, [block.content, isTemplate]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      contentRef.current?.blur();
    }
  };

  const handleBlur = () => {
    if (!onChange) return;
    const content = contentRef.current?.textContent || '';
    if (content !== block.content) {
      onChange(block.id, content);
    }
  };

  return (
    <div className="group relative w-[100px] h-[100px]">
      <div
        ref={contentRef}
        contentEditable={!isTemplate}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-full h-full rounded cursor-pointer p-2 text-sm
          flex items-center justify-center text-center
          transition-colors focus:outline-none focus:border-primary`}
        style={{ backgroundColor: 'inherit' }}
        suppressContentEditableWarning={true}
      >
        {isTemplate ? TYPE_LABELS[block.type] : (block.content || "Add New")}
      </div>

      {/* Type label - shows on hover */}
      <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-center text-gray-500 pb-1">
        {TYPE_LABELS[block.type]}
      </div>
    </div>
  );
}