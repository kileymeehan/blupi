import { useRef, useEffect, KeyboardEvent } from "react";
import { Plus } from "lucide-react";
import type { Block as BlockType } from "@shared/schema";

interface BlockProps {
  block: BlockType;
  onChange: (id: string, content: string) => void;
  onAdd: () => void;
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

export default function Block({ block, onChange, onAdd }: BlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.textContent = block.content;
    }
  }, [block.content]);

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
    <div className="group relative">
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

      {/* Type label - shows on hover */}
      <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-center text-gray-500 pb-1">
        {TYPE_LABELS[block.type]}
      </div>

      {/* Add button - shows on hover */}
      <button
        onClick={onAdd}
        className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity
          w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center
          hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}