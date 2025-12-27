import { useState, useEffect, useRef } from 'react';
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
  const [dots, setDots] = useState<{ x: number, y: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const allColumns = phases.flatMap((phase: Phase, phaseIndex: number) => 
    phase.columns.map((column: Column, columnIndex: number) => ({
      ...column,
      phaseIndex,
      columnIndex,
      emotion: column.emotion
    }))
  );

  const getEmotionY = (emotion: Emotion | undefined) => {
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

  // Update line coordinates whenever phases or board changes
  useEffect(() => {
    const updateDots = () => {
      if (!containerRef.current) return;
      const dotElements = containerRef.current.querySelectorAll('[data-emotion-dot]');
      const containerRect = containerRef.current.getBoundingClientRect();
      
      const newDots = Array.from(dotElements).map(el => {
        const rect = el.getBoundingClientRect();
        return {
          x: ((rect.left + rect.width / 2) - containerRect.left) / containerRect.width * 100,
          y: ((rect.top + rect.height / 2) - containerRect.top) / containerRect.height * 100
        };
      });
      setDots(newDots);
    };

    updateDots();
    // Observe for layout changes
    const observer = new ResizeObserver(updateDots);
    if (containerRef.current) observer.observe(containerRef.current);
    
    // Also update after a short delay for animations
    const timer = setTimeout(updateDots, 100);
    
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [phases, board]);

  if (allColumns.length === 0) return null;

  return (
    <div className={`w-full bg-white border border-slate-200 rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-semibold text-slate-800">Emotional Journey</h3>
        <div className="flex items-center gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>1-3 Negative</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span>4 Neutral</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span>5-7 Positive</span>
          </div>
        </div>
      </div>
      
      <div className="relative pl-10" ref={containerRef}>
        {/* Y-Axis Labels */}
        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs font-medium text-slate-400 py-1">
          <span>7</span>
          <span>4</span>
          <span>1</span>
        </div>
        
        {/* Grid Lines */}
        <div className="absolute inset-0 ml-10 flex flex-col justify-between pointer-events-none py-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-full h-px bg-slate-100" />
          ))}
        </div>

        {/* SVG Line */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          style={{ paddingLeft: '2.5rem' }} 
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {dots.length > 1 && (
            <motion.path
              d={dots.map((dot, i) => `${i === 0 ? 'M' : 'L'} ${dot.x} ${dot.y}`).join(' ')}
              stroke="#6366f1"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.4 }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          )}
        </svg>
        
        {/* Content Layer */}
        <div className="relative z-10 flex items-start">
          {board.phases.map((phase: Phase, phaseIndex: number) => (
            <div key={phase.id} className="flex flex-shrink-0 mr-4 sm:mr-6 lg:mr-8">
              <div className="flex gap-4 md:gap-8 px-4">
                {phase.columns.map((column: Column, columnIndex: number) => {
                  const globalColumnIndex = board.phases.slice(0, phaseIndex).reduce((acc: number, p: Phase) => acc + p.columns.length, 0) + columnIndex;
                  const emotion = allColumns[globalColumnIndex]?.emotion;
                  const yPosition = getEmotionY(emotion);
                  
                  return (
                    <div 
                      key={column.id} 
                      className="flex-shrink-0 w-[180px] sm:w-[200px] md:w-[225px] flex flex-col items-center"
                      style={{ minHeight: '140px' }}
                    >
                      <div className="relative w-full h-[120px] flex justify-center">
                        <motion.div
                          data-emotion-dot
                          className="absolute z-20"
                          style={{
                            top: `${yPosition}%`,
                            left: '50%',
                            transform: 'translate(-50%, -50%)'
                          }}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: globalColumnIndex * 0.05 }}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0 rounded-full border-2 shadow-md hover:scale-110 transition-transform text-white font-bold"
                                style={{
                                  backgroundColor: emotion?.color || '#f8fafc',
                                  borderColor: emotion?.color || '#e2e8f0',
                                  color: emotion ? 'white' : '#94a3b8'
                                }}
                              >
                                {emotion?.value || '○'}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center" className="w-48">
                              {Object.entries(EMOTION_SCALE).map(([value, data]) => (
                                <DropdownMenuItem
                                  key={value}
                                  onClick={() => handleEmotionSelect(phaseIndex, columnIndex, parseInt(value))}
                                  className="flex items-center gap-3 py-2"
                                >
                                  <div 
                                    className="w-5 h-5 rounded-full shadow-sm" 
                                    style={{ backgroundColor: data.color }}
                                  />
                                  <div className="flex flex-col">
                                    <span className="text-sm font-semibold">Level {value}</span>
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">{data.label}</span>
                                  </div>
                                </DropdownMenuItem>
                              ))}
                              {emotion && (
                                <>
                                  <div className="border-t my-1" />
                                  <DropdownMenuItem
                                    onClick={() => handleRemoveEmotion(phaseIndex, columnIndex)}
                                    className="text-red-600 hover:bg-red-50 font-medium"
                                  >
                                    Clear Score
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </motion.div>
                      </div>
                      
                      <div className="mt-2 px-2 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[120px]">
                          {column.name || `Step ${columnIndex + 1}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
