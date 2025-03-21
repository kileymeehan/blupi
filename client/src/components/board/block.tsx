import { useRef, useEffect, KeyboardEvent, useState } from "react";
import { MessageSquare, Paperclip, StickyNote, Smile, Tags } from "lucide-react";
import type { Block as BlockType, Attachment, Tag } from "@shared/schema";
import { AttachmentDialog } from "./attachment-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";

interface BlockProps {
  block: BlockType;
  onChange?: (content: string) => void;
  onAttachmentChange?: (id: string, attachments: Attachment[]) => void;
  onNotesChange?: (id: string, notes: string) => void;
  onEmojiChange?: (blockId: string, emoji: string) => void;
  isTemplate?: boolean;
  onCommentClick?: () => void;
  projectId?: number;
  isHighlighted?: boolean;
}

const TYPE_LABELS = {
  touchpoint: 'Touchpoint',
  email: 'Email Touchpoint',
  pendo: 'Pendo Touchpoint',
  role: 'Role',
  process: 'Process',
  friction: 'Friction',
  policy: 'Policy',
  technology: 'Technology',
  rationale: 'Rationale',
  question: 'Question',
  note: 'Note',
  hidden: 'Hidden Step'
} as const;

export default function Block({
  block,
  onChange,
  onAttachmentChange,
  onNotesChange,
  onEmojiChange,
  isTemplate = false,
  onCommentClick,
  projectId,
  isHighlighted = false
}: BlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [notes, setNotes] = useState(block.notes || '');
  const [localContent, setLocalContent] = useState(block.content || '');
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { sendMessage } = useWebSocket(block.id);

  // Update content when block changes from external source
  useEffect(() => {
    if (contentRef.current && !isTemplate) {
      setLocalContent(block.content || '');
      contentRef.current.textContent = block.content || '';
    }
  }, [block.content, isTemplate]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      contentRef.current?.blur();
    }
  };

  const handleInput = () => {
    if (!contentRef.current) return;
    const newContent = contentRef.current.textContent || '';
    setLocalContent(newContent);

    // Preserve cursor position at end of text
    if (contentRef.current) {
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(contentRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  };

  const handleBlur = () => {
    if (!onChange || !contentRef.current) return;
    const content = contentRef.current.textContent || '';
    if (content !== block.content) {
      onChange(content);
    }
  };

  const handleNotesChange = () => {
    if (!onNotesChange) return;
    onNotesChange(block.id, notes);
    setNotesDialogOpen(false);
  };

  const handleEmojiSelect = (emoji: any) => {
    if (!onEmojiChange) return;
    onEmojiChange(block.id, emoji.native);
    setEmojiPickerOpen(false);
  };

  const commentCount = block.comments?.length || 0;
  const attachmentCount = block.attachments?.length || 0;

  // Add tags query
  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: [`/api/boards/${projectId}/tags`],
    enabled: !!projectId && tagDialogOpen,
  });

  // Add create tag mutation
  const createTagMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/boards/${projectId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTagName,
          color: "#E2E8F0", // Default color
          boardId: projectId
        }),
      });
      if (!res.ok) throw new Error("Failed to create tag");
      return res.json();
    },
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${projectId}/tags`] });
      setNewTagName("");
      // Notify other users about the new tag
      sendMessage({
        type: 'tag_created',
        tagId: newTag.id,
        blockId: block.id
      });
      toast({
        title: "Success",
        description: "Tag created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add tag toggle mutation
  const toggleTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      const hasTag = block.tags?.includes(tagId);
      const method = hasTag ? "DELETE" : "POST";
      const res = await fetch(
        `/api/boards/${projectId}/blocks/${block.id}/tags/${tagId}`,
        { method }
      );
      if (!res.ok) throw new Error(`Failed to ${hasTag ? "remove" : "add"} tag`);
      return res.json();
    },
    onSuccess: (_, tagId) => {
      queryClient.invalidateQueries({ queryKey: [`/api/boards/${projectId}`] });
      // Notify other users about the tag change
      sendMessage({
        type: 'tag_updated',
        tagId,
        blockId: block.id
      });
      toast({
        title: "Success",
        description: "Tags updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="w-full h-full p-2">
      {block.emoji && (
        <div className="absolute -top-2 -right-2 z-10 text-lg cursor-default">
          <span role="img" aria-label="emoji" className="select-none">
            {block.emoji}
          </span>
        </div>
      )}

      <div
        ref={contentRef}
        contentEditable={!isTemplate}
        onInput={handleInput}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`
          w-full min-h-[100px] px-3 py-4 pt-8 text-sm
          ${isTemplate ? 'flex items-center justify-center' : ''}
          ${isHighlighted ? 'ring-2 ring-primary ring-offset-2 bg-primary/5' : ''}
          overflow-y-auto whitespace-pre-wrap break-words
          leading-normal text-center
          focus:outline-none
          focus:bg-white/50
          transition-colors duration-200
        `}
        style={{ backgroundColor: 'inherit' }}
        suppressContentEditableWarning={true}
      >
        {isTemplate ? TYPE_LABELS[block.type] : localContent}
      </div>

      {!isTemplate && (
        <div className={`
          absolute bottom-0 inset-x-0 px-2 py-1
          text-xs text-gray-500
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200
          text-center whitespace-nowrap overflow-hidden text-ellipsis
        `}>
          {TYPE_LABELS[block.type]}
        </div>
      )}

      {!isTemplate && (
        <div className="absolute top-1 right-1 flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setTagDialogOpen(true);
            }}
            className={`
              flex items-center gap-1 p-1
              rounded bg-white/80 backdrop-blur-sm
              text-xs text-gray-600 hover:text-gray-900
              shadow-sm hover:shadow
              opacity-0 group-hover:opacity-100
              ${block.tags?.length ? '!opacity-100 text-blue-600' : ''}
              transition-all duration-150
            `}
          >
            <Tags className="w-4 h-4" />
            {block.tags?.length > 0 && <span>{block.tags.length}</span>}
          </button>
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
              opacity-0 group-hover:opacity-100
              ${commentCount > 0 ? '!opacity-100' : ''}
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
              ${attachmentCount > 0 ? '!opacity-100 text-blue-600' : ''}
              transition-all duration-150
            `}
          >
            <Paperclip className="w-4 h-4" />
            {attachmentCount > 0 && <span>{attachmentCount}</span>}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setNotesDialogOpen(true);
            }}
            className={`
              flex items-center gap-1 p-1
              rounded bg-white/80 backdrop-blur-sm
              text-xs text-gray-600 hover:text-gray-900
              shadow-sm hover:shadow
              opacity-0 group-hover:opacity-100
              ${block.notes ? '!opacity-100 text-yellow-600' : ''}
              transition-all duration-150
            `}
          >
            <StickyNote className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (block.emoji) {
                onEmojiChange?.(block.id, '');
              } else {
                setEmojiPickerOpen(true);
              }
            }}
            className={`
              flex items-center gap-1 p-1
              rounded bg-white/80 backdrop-blur-sm
              text-xs text-gray-600 hover:text-gray-900
              shadow-sm hover:shadow
              opacity-0 group-hover:opacity-100
              ${block.emoji ? 'text-yellow-600' : ''}
              transition-all duration-150
            `}
            title={block.emoji ? "Remove emoji" : "Add emoji"}
          >
            <Smile className="w-4 h-4" />
          </button>
        </div>
      )}

      <AttachmentDialog
        open={attachmentDialogOpen}
        onOpenChange={setAttachmentDialogOpen}
        projectId={projectId}
        currentAttachments={block.attachments}
        onAttach={(attachments) => onAttachmentChange?.(block.id, attachments)}
      />

      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Add notes about this block..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[200px]"
            />
            <Button onClick={handleNotesChange} className="w-full">
              Save Notes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Emoji</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Picker
              data={data}
              onEmojiSelect={handleEmojiSelect}
              theme="light"
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Tags</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className={`cursor-pointer flex items-center justify-between ${
                    block.tags?.includes(tag.id) ? 'ring-2 ring-primary' : ''
                  }`}
                  style={{
                    backgroundColor: `${tag.color}40`,
                    borderColor: tag.color
                  }}
                  onClick={() => toggleTagMutation.mutate(tag.id)}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Create New Tag</div>
              <div className="flex gap-2">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Tag name"
                  className="flex-1"
                />
                <Button
                  size="sm"
                  disabled={!newTagName.trim() || createTagMutation.isPending}
                  onClick={() => createTagMutation.mutate()}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}