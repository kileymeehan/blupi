import React, { useEffect, useRef, useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';

interface StableDraggableProps {
  draggableId: string;
  index: number;
  children: (provided: any, snapshot: any) => React.ReactNode;
}

// Wrapper component that adds stability to drag operations
export function StableDraggable({ draggableId, index, children }: StableDraggableProps) {
  const [isStable, setIsStable] = useState(true);
  const retryCount = useRef(0);
  const maxRetries = 3;

  // Reset stability on prop changes
  useEffect(() => {
    setIsStable(true);
    retryCount.current = 0;
  }, [draggableId, index]);

  const handleError = () => {
    if (retryCount.current < maxRetries) {
      retryCount.current++;
      setIsStable(false);
      // Force a re-render after a brief delay
      setTimeout(() => setIsStable(true), 100);
    }
  };

  if (!isStable) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-lg h-[90px] w-full flex items-center justify-center">
        <span className="text-xs text-gray-500">Loading...</span>
      </div>
    );
  }

  try {
    return (
      <Draggable draggableId={draggableId} index={index}>
        {(provided, snapshot) => {
          try {
            return children(provided, snapshot);
          } catch (error) {
            console.warn('Draggable render error:', error);
            handleError();
            return (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-600">
                Temporary render issue - refreshing...
              </div>
            );
          }
        }}
      </Draggable>
    );
  } catch (error) {
    console.warn('Draggable component error:', error);
    handleError();
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-600">
        Drag disabled temporarily
      </div>
    );
  }
}