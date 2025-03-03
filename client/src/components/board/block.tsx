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
      contentRef.current.textContent = block.content || '';
    }
  }, [block.content, isTemplate]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      contentRef.current?.blur();
    }
  };

  const handleBlur = () => {
    if (!onChange || isTemplate) return;
    const content = contentRef.current?.textContent || '';
    if (content !== block.content) {
      onChange(block.id, content);
    }
  };

  return (
    <div className="w-[60px] h-[80px] pointer-events-auto">
      <div
        ref={contentRef}
        contentEditable={!isTemplate}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full h-full rounded-md p-2 text-xs flex items-center justify-center text-center
          focus:outline-none focus:ring-2 focus:ring-primary"
        suppressContentEditableWarning={true}
      >
        {isTemplate ? TYPE_LABELS[block.type] : (block.content || "Add text")}
      </div>
    </div>
  );
}