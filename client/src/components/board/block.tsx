import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import type { Block as BlockType } from "@shared/schema";

interface BlockProps {
  block: BlockType;
  onChange: (id: string, content: string) => void;
}

export default function Block({ block, onChange }: BlockProps) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(block.content);

  const handleBlur = () => {
    setEditing(false);
    onChange(block.id, content);
  };

  if (editing) {
    return (
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleBlur}
        className="w-full h-[120px] resize-none text-sm p-2 border-2"
        autoFocus
      />
    );
  }

  return (
    <div
      className="w-full h-[120px] bg-white rounded shadow-sm cursor-pointer p-2 text-sm overflow-y-auto border border-gray-200 hover:border-gray-300 transition-colors"
      onClick={() => setEditing(true)}
    >
      {content || "Click to add content"}
    </div>
  );
}