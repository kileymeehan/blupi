import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phase, Column, Emotion } from '@shared/schema';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Emotion scale 1-7 with colors from red (negative) to green (positive)
const EMOTION_SCALE = {
  1: { color: '#dc2626', label: 'Very Negative' },
  2: { color: '#ef4444', label: 'Negative' },
  3: { color: '#f59e0b', label: 'Somewhat Negative' },
  4: { color: '#eab308', label: 'Neutral' },
  5: { color: '#84cc16', label: 'Somewhat Positive' },
  6: { color: '#22c55e', label: 'Positive' },
  7: { color: '#16a34a', label: 'Very Positive' },
};

interface EmotionJourneyProps {
  phases: Phase[];
  board: Board;
  onEmotionChange: (phaseIndex: number, columnIndex: number, emotion: Emotion | null) => void;
  className?: string;
  singleColumn?: boolean;
}

export function EmotionJourney({ phases, board, onEmotionChange, className = '', singleColumn = false }: EmotionJourneyProps) {
  const [animationComplete, setAnimationComplete] = useState(false);
  
  // Get all columns across all phases for the journey
  const allColumns = phases.flatMap((phase, phaseIndex) => 
    phase.columns.map((column, columnIndex) => ({
      ...column,
      phaseIndex,
      columnIndex,
      emotion: column.emotion
    }))
  );

  // Remove debug logs for cleaner code

  // Calculate positions for the line graph
  const getEmotionPosition = (emotion: Emotion | undefined) => {
    if (!emotion) return 50; // Center for unset
    // Convert value (1-7) to percentage (0-100)
    return ((emotion.value - 1) / 6) * 100;
  };

  const handleEmotionSelect = (phaseIndex: number, columnIndex: number, value: number) => {
    const emotionData = EMOTION_SCALE[value as keyof typeof EMOTION_SCALE];
    const emotion: Emotion = {
      value,
      color: emotionData.color
    };
    onEmotionChange(phaseIndex, columnIndex, emotion);
  };

  const handleRemoveEmotion = (phaseIndex: number, columnIndex: number) => {
    onEmotionChange(phaseIndex, columnIndex, null);
  };

  // Animate the line drawing
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationComplete(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (allColumns.length === 0) return null;

  // Single column mode - just show the emotion dot
  if (singleColumn) {
    const column = allColumns[0];
    const emotion = column.emotion;
    
    return (
      <div className={`w-full flex justify-center ${className}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full border-2 shadow-sm hover:scale-110 transition-transform text-white font-semibold"
              style={{
                backgroundColor: emotion?.color || '#e2e8f0',
                borderColor: emotion?.color || '#cbd5e1',
                color: emotion ? 'white' : '#64748b'
              }}
            >
              <span className="text-sm">
                {emotion?.value || '○'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-44">
            {Object.entries(EMOTION_SCALE).map(([value, data]) => (
              <DropdownMenuItem
                key={value}
                onClick={() => handleEmotionSelect(column.phaseIndex, column.columnIndex, parseInt(value))}
                className="flex items-center gap-2"
              >
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: data.color }}
                />
                <span className="text-sm font-medium">{value}</span>
                <span className="text-xs text-slate-500">{data.label}</span>
              </DropdownMenuItem>
            ))}
            {emotion && (
              <>
                <div className="border-t my-1" />
                <DropdownMenuItem
                  onClick={() => handleRemoveEmotion(column.phaseIndex, column.columnIndex)}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove emotion
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className={`w-full bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-700">Emotional Journey</h3>
        <span className="text-xs text-slate-500">Click dots to set emotions</span>
      </div>
      
      <div className="relative">
        {/* Emotion scale indicators */}
        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-slate-400">
          <span>7</span>
          <span>4</span>
          <span>1</span>
        </div>
        
        {/* Main graph area */}
        <div className="ml-10 relative" style={{ height: '120px' }}>
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-full h-px bg-slate-200" />
            ))}
          </div>
          
          {/* Emotion dots positioned absolutely to match column centers */}
          <div className="absolute inset-0">
            {allColumns.map((column, index) => {
              const emotion = column.emotion;
              const yPosition = getEmotionPosition(emotion);
              
              // Calculate position based on column distribution
              // For single phase with multiple columns, distribute evenly
              const totalColumns = allColumns.length;
              const leftPercentage = totalColumns === 1 ? 50 : ((index / (totalColumns - 1)) * 100);
              
              return (
                <motion.div
                  key={`${column.phaseIndex}-${column.columnIndex}`}
                  className="absolute flex flex-col items-center"
                  style={{
                    left: `${leftPercentage}%`,
                    top: `${100 - yPosition}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    delay: index * 0.1,
                    duration: 0.3,
                    type: "spring",
                    stiffness: 200 
                  }}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full border-2 shadow-sm hover:scale-110 transition-transform text-white font-semibold"
                        style={{
                          backgroundColor: emotion?.color || '#e2e8f0',
                          borderColor: emotion?.color || '#cbd5e1',
                          color: emotion ? 'white' : '#64748b'
                        }}
                      >
                        <span className="text-sm">
                          {emotion?.value || '○'}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-44">
                      {Object.entries(EMOTION_SCALE).map(([value, data]) => (
                        <DropdownMenuItem
                          key={value}
                          onClick={() => handleEmotionSelect(column.phaseIndex, column.columnIndex, parseInt(value))}
                          className="flex items-center gap-2"
                        >
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: data.color }}
                          />
                          <span className="text-sm font-medium">{value}</span>
                          <span className="text-xs text-slate-500">{data.label}</span>
                        </DropdownMenuItem>
                      ))}
                      {emotion && (
                        <>
                          <div className="border-t my-1" />
                          <DropdownMenuItem
                            onClick={() => handleRemoveEmotion(column.phaseIndex, column.columnIndex)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove emotion
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {/* Column name below the dot */}
                  <span className="text-xs text-slate-500 mt-1 text-center max-w-16 truncate">
                    {column.name}
                  </span>
                </motion.div>
              );
            })}
          </div>
          
          {/* Connecting line */}
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <motion.path
              d={allColumns.map((column, index) => {
                const totalColumns = allColumns.length;
                const x = totalColumns === 1 ? 50 : ((index / (totalColumns - 1)) * 100);
                const y = 100 - getEmotionPosition(column.emotion);
                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              stroke="#6366f1"
              strokeWidth="2"
              fill="none"
              strokeDasharray="4,4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />
          </svg>

        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>1-3 Negative</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>4 Neutral</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>5-7 Positive</span>
          </div>
        </div>
      </div>
    </div>
  );
}