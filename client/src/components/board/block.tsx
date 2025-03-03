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
        className="w-full min-h-[100px] resize-none"
        autoFocus
      />
    );
  }

  return (
    <div
      className="p-2 bg-white rounded shadow-sm cursor-pointer min-h-[100px]"
      onClick={() => setEditing(true)}
    >
      {content || "Click to add content"}
    </div>
  );
}
