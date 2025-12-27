import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phase, Column, Emotion, Board } from '@shared/schema';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  
  const allColumns = phases.flatMap((phase: Phase, phaseIndex: number) => 
    phase.columns.map((column: Column, columnIndex: number) => ({
      ...column,
      phaseIndex,
      columnIndex,
      emotion: column.emotion
    }))
  );

  const getEmotionPosition = (emotion: Emotion | undefined) => {
    if (!emotion) return 50;
    return 100 - ((emotion.value - 1) / 6) * 100;
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationComplete(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (allColumns.length === 0) return null;

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
        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-slate-400">
          <span>7</span>
          <span>4</span>
          <span>1</span>
        </div>
        
        <div className="ml-10 relative" style={{ height: '120px' }}>
          <div className="absolute inset-0 flex flex-col justify-between">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-full h-px bg-slate-200" />
            ))}
          </div>
          
          <div className="absolute inset-0 flex items-start gap-4 sm:gap-6 lg:gap-8 pointer-events-none">
            {board.phases.map((phase: Phase, phaseIndex: number) => (
              <div key={phase.id} className="flex-shrink-0 relative mr-4 sm:mr-6 lg:mr-8 pointer-events-auto">
                <div className="px-4">
                  <div className="flex gap-4 md:gap-8">
                    {phase.columns.map((column: Column, columnIndex: number) => {
                      const globalColumnIndex = board.phases.slice(0, phaseIndex).reduce((acc: number, p: Phase) => acc + p.columns.length, 0) + columnIndex;
                      const emotion = allColumns[globalColumnIndex]?.emotion;
                      const yPosition = getEmotionPosition(emotion);
                      
                      return (
                        <div 
                          key={column.id} 
                          className="flex-shrink-0 w-[180px] sm:w-[200px] md:w-[225px] flex justify-center relative group/col"
                        >
                          <div className="absolute inset-y-0 left-1/2 w-px bg-slate-100/50 -translate-x-1/2" />
                          
                          <motion.div
                            className="absolute flex flex-col items-center z-10"
                            style={{
                              top: `${yPosition}%`,
                              left: '50%',
                              transform: 'translate(-50%, -50%)'
                            }}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ 
                              delay: globalColumnIndex * 0.1,
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
                                    onClick={() => handleEmotionSelect(phaseIndex, columnIndex, parseInt(value))}
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
                                      onClick={() => handleRemoveEmotion(phaseIndex, columnIndex)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      Remove emotion
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            
                            <span className="text-xs text-slate-500 mt-1 text-center max-w-16 truncate">
                              {column.name}
                            </span>
                          </motion.div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <motion.path
              d={(() => {
                const pathCommands: string[] = [];
                
                // We need to calculate the actual X position for each column
                // based on the flex layout widths and gaps.
                // Since we're in a relative container with 100% width, 
                // we'll use a ref-based or calculation-based approach.
                // For now, let's improve the calculation by tracking the exact 
                // percentages of the container width.
                
                let currentX = 0;
                const phaseGap = 32; // sm:gap-6 lg:gap-8 ≈ 32px
                const columnGap = 32; // gap-4 md:gap-8 ≈ 32px
                
                // This is a complex calculation for an SVG path in a flex container.
                // A better approach is to render the path using the same flex layout
                // but for now, let's use the simplified version and fix the centering.
                
                allColumns.forEach((column, globalColumnIndex) => {
                  const emotion = column.emotion;
                  const y = getEmotionPosition(emotion);
                  
                  const totalColumns = allColumns.length;
                  const columnWidth = 100 / totalColumns;
                  const x = (globalColumnIndex * columnWidth) + (columnWidth / 2);
                  
                  pathCommands.push(`${globalColumnIndex === 0 ? 'M' : 'L'} ${x} ${y}`);
                });
                
                return pathCommands.join(' ');
              })()}
              stroke="#6366f1"
              strokeWidth="1.5"
              fill="none"
              strokeDasharray="3,3"
              opacity="0.7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />
          </svg>

        </div>
        
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
