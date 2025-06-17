import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';

interface SafeDragContextType {
  isDragActive: boolean;
  setIsDragActive: (active: boolean) => void;
  pendingUpdates: (() => void)[];
  addPendingUpdate: (update: () => void) => void;
  executePendingUpdates: () => void;
}

const SafeDragContext = createContext<SafeDragContextType | null>(null);

export function useSafeDrag() {
  const context = useContext(SafeDragContext);
  if (!context) {
    throw new Error('useSafeDrag must be used within SafeDragProvider');
  }
  return context;
}

interface SafeDragProviderProps {
  children: React.ReactNode;
  onDragEnd: (result: DropResult) => void;
}

export function SafeDragProvider({ children, onDragEnd }: SafeDragProviderProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<(() => void)[]>([]);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addPendingUpdate = (update: () => void) => {
    if (isDragActive) {
      setPendingUpdates(prev => [...prev, update]);
    } else {
      update();
    }
  };

  const executePendingUpdates = () => {
    if (pendingUpdates.length > 0) {
      // Execute updates after a small delay to ensure DOM is stable
      setTimeout(() => {
        pendingUpdates.forEach(update => {
          try {
            update();
          } catch (error) {
            console.warn('Pending update failed:', error);
          }
        });
        setPendingUpdates([]);
      }, 50);
    }
  };

  const handleDragStart = () => {
    setIsDragActive(true);
    // Clear any pending timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    // Execute the drag end handler
    try {
      onDragEnd(result);
    } catch (error) {
      console.error('Drag end error:', error);
    }
    
    // Clear drag state and execute pending updates
    setIsDragActive(false);
    
    // Execute pending updates after a delay to ensure DOM stability
    updateTimeoutRef.current = setTimeout(() => {
      executePendingUpdates();
    }, 100);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  const contextValue: SafeDragContextType = {
    isDragActive,
    setIsDragActive,
    pendingUpdates,
    addPendingUpdate,
    executePendingUpdates,
  };

  return (
    <SafeDragContext.Provider value={contextValue}>
      <DragDropContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {children}
      </DragDropContext>
    </SafeDragContext.Provider>
  );
}