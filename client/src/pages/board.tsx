import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import BoardGrid from "@/components/board/board-grid";
import type { Board, Block, Phase } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
import { Loader2 } from "lucide-react";
import { withErrorBoundary } from "@/components/error-boundary";
import { useRef, useEffect, useCallback, useState } from "react";

export default function BoardPage() {
  const { id } = useParams();
  const { toast } = useToast();

  const { sendMessage, connectedUsers, lastMessage } = useWebSocket(id || '');

  // Listen for incoming board updates via WebSocket for real-time collaboration
  useEffect(() => {
    console.log('[BoardPage] WebSocket message received:', lastMessage?.type);
    if (lastMessage?.type === 'board_update' && lastMessage.board) {
      console.log('[BoardPage] Processing real-time board update:', lastMessage.board.id);
      // Immediately update the local cache with incoming changes
      queryClient.setQueryData(['/api/boards', id], lastMessage.board);
    }
  }, [lastMessage, id]);

  // Pending background saves (see saveBoard below)
  // The board as last edited locally, shown until the server confirms it.
  // Kept in React state (not just the query cache) because the drag library
  // re-renders synchronously on drop, while cache updates notify a tick later,
  // which would show the old card order for one frame.
  const [optimisticBoard, setOptimisticBoard] = useState<Board | null>(null);
  const optimisticRef = useRef<Board | null>(null);
  const saveQueue = useRef<{ inFlight: boolean; queued: Partial<Board> | null }>({
    inFlight: false,
    queued: null,
  });

  const { data: board, isLoading, error } = useQuery({
    queryKey: ['/api/boards', id],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${id}`);
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("Too many requests. Please wait a moment before trying again.");
        }
        throw new Error('Failed to fetch board');
      }
      const board = await res.json();
      return board;
    },
    // Don't poll while a save is pending, or a stale fetch could undo a local change
    refetchInterval: () => (saveQueue.current.inFlight || saveQueue.current.queued ? false : 60000),
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes("Too many requests")) {
        return false;
      }
      return failureCount < 3;
    },
    gcTime: 1000 * 60 * 5,
  });

  const { data: project } = useQuery({
    queryKey: ['/api/projects', board?.projectId],
    queryFn: async () => {
      if (!board?.projectId) return null;
      const res = await fetch(`/api/projects/${board.projectId}`);
      if (!res.ok) throw new Error('Failed to fetch project');
      return res.json();
    },
    enabled: !!board?.projectId,
  });

  // Changes are applied to the cached board immediately (so drag-and-drop
  // settles in place with no snap-back), then saved in the background.
  // Saves run one at a time; edits made while one is in flight are merged
  // into the next request, so rapid changes can't reach the server out of order.
  const boardKey = ['/api/boards', id];

  const flushSaves = useCallback(async () => {
    const q = saveQueue.current;
    if (q.inFlight || !q.queued) return;
    const updates = q.queued;
    q.queued = null;
    q.inFlight = true;
    try {
      const res = await apiRequest("PATCH", `/api/boards/${id}`, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      const saved = await res.json();
      // Only adopt the server's copy if nothing newer is waiting to be sent
      if (!q.queued) {
        queryClient.setQueryData(boardKey, saved);
        optimisticRef.current = null;
        setOptimisticBoard(null);
      }
      sendMessage({ type: 'board_update', board: saved, timestamp: Date.now() });
    } catch (error) {
      console.error('Board update error:', error);
      q.queued = null;
      optimisticRef.current = null;
      setOptimisticBoard(null);
      queryClient.invalidateQueries({ queryKey: boardKey });
      toast({
        title: "Error saving changes",
        description: error instanceof Error ? error.message : "Your last change couldn't be saved.",
        variant: "destructive",
      });
    } finally {
      q.inFlight = false;
      if (q.queued) flushSaves();
    }
  }, [id, sendMessage, toast]);

  const saveBoard = useCallback((updates: Partial<Board>) => {
    const base = optimisticRef.current ?? queryClient.getQueryData<Board>(boardKey);
    if (!base) return;
    const next = { ...base, ...updates };
    optimisticRef.current = next;
    setOptimisticBoard(next);
    queryClient.cancelQueries({ queryKey: boardKey });
    queryClient.setQueryData<Board>(boardKey, next);
    saveQueue.current.queued = { ...saveQueue.current.queued, ...updates };
    flushSaves();
  }, [flushSaves]);

  // Debug logging to help identify the issue
  console.log('Board page render:', { id, isLoading, board: !!board, error });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <div className="text-lg">Loading board...</div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Board error:', error);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-2">{error.message}</div>
          <div className="text-sm text-gray-600">Please wait a moment and try again</div>
        </div>
      </div>
    );
  }

  if (!board) {
    console.warn('Board data is missing');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="text-lg text-red-600">Board not found</div>
          <div className="text-sm text-gray-600">The board you're looking for doesn't exist or couldn't be loaded.</div>
        </div>
      </div>
    );
  }

  const handleBlocksChange = (blocks: Block[]) => saveBoard({ blocks });
  const handlePhasesChange = (phases: Phase[]) => saveBoard({ phases });
  const handleBoardChange = (updates: Partial<Board>) => saveBoard(updates);

  try {
    console.log('Rendering BoardGrid with:', { 
      id, 
      boardId: board.id, 
      boardName: board.name,
      blocksCount: board.blocks?.length || 0,
      phasesCount: board.phases?.length || 0,
      projectId: board.projectId 
    });

    return (
      <BoardGrid
        id={id!}
        board={optimisticBoard ?? board}
        onBlocksChange={handleBlocksChange}
        onPhasesChange={handlePhasesChange}
        onBoardChange={handleBoardChange}
        connectedUsers={connectedUsers}
        project={project}
      />
    );
  } catch (error) {
    console.error('Error rendering BoardGrid:', error);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="text-lg text-red-600">Error loading board</div>
          <div className="text-sm text-gray-600">There was a problem rendering this board. Please try refreshing the page.</div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
}