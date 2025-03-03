import { useRef, useEffect, KeyboardEvent } from "react";
import type { Block as BlockType } from "@shared/schema";

interface BlockProps {
  block: BlockType;
  onChange?: (id: string, content: string) => void;
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

export default function Block({ block, onChange }: BlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.textContent = block.content || '';
    }
  }, [block.content]);

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
    <div className="w-28 h-20 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-t-lg border-b">
        {TYPE_LABELS[block.type]}
      </div>
      <div
        ref={contentRef}
        contentEditable
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="p-2 text-xs min-h-[40px] focus:outline-none focus:ring-2 focus:ring-primary rounded-b-lg"
        suppressContentEditableWarning={true}
      >
        {block.content || "Add text"}
      </div>
    </div>
  );
}