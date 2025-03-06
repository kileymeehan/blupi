import { useRef, useEffect, KeyboardEvent, useState } from "react";
import { MessageSquare, Paperclip } from "lucide-react";
import type { Block as BlockType } from "@shared/schema";
import { AttachmentDialog } from "./attachment-dialog";

interface BlockProps {
  block: BlockType;
  onChange?: (id: string, content: string) => void;
  onAttachmentChange?: (id: string, attachment: { type: 'link' | 'image' | 'video', url: string }) => void;
  isTemplate?: boolean;
  onCommentClick?: () => void;
  projectId?: number;
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

export default function Block({ block, onChange, onAttachmentChange, isTemplate = false, onCommentClick, projectId }: BlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);

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

  const commentCount = block.comments?.length || 0;

  return (
    <div className="group relative w-full h-full px-2">
      <div
        ref={contentRef}
        contentEditable={!isTemplate}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`
          w-full min-h-[120px] rounded-lg px-3 py-3 text-sm
          ${isTemplate ? 'flex items-center justify-center' : 'flex items-start text-left'}
          overflow-y-auto whitespace-pre-wrap break-words
          leading-normal
          transition-all duration-150 ease-out
          focus:outline-none focus:ring-2 focus:ring-primary/20
        `}
        style={{ backgroundColor: 'inherit' }}
        suppressContentEditableWarning={true}
      >
        {isTemplate && TYPE_LABELS[block.type]}
      </div>

      {/* Type label - shows on hover */}
      <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-xs text-center text-gray-500 pb-1">
        {TYPE_LABELS[block.type]}
      </div>

      {/* Action buttons - only show if not template */}
      {!isTemplate && (
        <div className="absolute top-1 right-1 flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCommentClick?.();
            }}
            className={`
              flex items-center gap-1 p-1
              rounded bg-white/80 backdrop-blur-sm
              text-xs text-gray-600 hover:text-gray-900
              shadow-sm hover:shadow
              ${commentCount > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
              transition-all duration-150
            `}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{commentCount}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setAttachmentDialogOpen(true);
            }}
            className={`
              flex items-center gap-1 p-1
              rounded bg-white/80 backdrop-blur-sm
              text-xs text-gray-600 hover:text-gray-900
              shadow-sm hover:shadow
              opacity-0 group-hover:opacity-100
              transition-all duration-150
              ${block.attachment ? 'text-blue-600' : ''}
            `}
          >
            <Paperclip className="w-4 h-4" />
          </button>
        </div>
      )}

      <AttachmentDialog 
        open={attachmentDialogOpen}
        onOpenChange={setAttachmentDialogOpen}
        projectId={projectId}
        currentAttachment={block.attachment}
        onAttach={(attachment) => onAttachmentChange?.(block.id, attachment)}
      />
    </div>
  );
}