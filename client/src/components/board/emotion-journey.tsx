import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
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
  const [pathD, setPathD] = useState<string>('');
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });
  const [hasInitialized, setHasInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
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

  const updateSparkline = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;
    
    const dotElements = contentRef.current.querySelectorAll('[data-emotion-dot]');
    if (dotElements.length === 0) return;
    
    const contentRect = contentRef.current.getBoundingClientRect();
    const scrollWidth = contentRef.current.scrollWidth;
    const height = contentRef.current.offsetHeight;
    
    const dots: { x: number; y: number }[] = [];
    
    dotElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const x = (rect.left - contentRect.left) + (rect.width / 2);
      const y = (rect.top - contentRect.top) + (rect.height / 2);
      dots.push({ x, y });
    });
    
    if (dots.length > 0) {
      setSvgDimensions({ width: scrollWidth, height });
      const path = dots.map((dot, i) => `${i === 0 ? 'M' : 'L'} ${dot.x} ${dot.y}`).join(' ');
      setPathD(path);
      
      if (!hasInitialized) {
        setTimeout(() => setHasInitialized(true), 100);
      }
    }
  }, [hasInitialized]);

  useEffect(() => {
    updateSparkline();
    
    const observer = new ResizeObserver(updateSparkline);
    if (containerRef.current) observer.observe(containerRef.current);
    if (contentRef.current) observer.observe(contentRef.current);
    
    const scrollContainer = document.getElementById('board-scroll-container');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updateSparkline);
    }
    
    const timers = [
      setTimeout(updateSparkline, 100),
      setTimeout(updateSparkline, 300),
      setTimeout(updateSparkline, 600),
    ];
    
    return () => {
      observer.disconnect();
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', updateSparkline);
      }
      timers.forEach(clearTimeout);
    };
  }, [phases, board, updateSparkline]);

  if (allColumns.length === 0) return null;

  const CHART_HEIGHT = 180;
  const BOTTOM_PADDING = 35;

  return (
    <div className={`w-full bg-slate-50 border-2 border-slate-300 rounded-xl p-6 shadow-sm ${className}`} ref={containerRef}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900">Emotional Journey</h3>
        <div className="flex items-center gap-6 text-xs font-medium text-slate-600">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm" />
            <span>1-3 Negative</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm" />
            <span>4 Neutral</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm" />
            <span>5-7 Positive</span>
          </div>
        </div>
      </div>
      
      <div className="relative bg-white rounded-lg border border-slate-200 p-4">
        <div className="absolute left-4 top-4 bottom-4 w-6 flex flex-col justify-between text-[10px] font-semibold text-slate-400 z-10" style={{ paddingBottom: `${BOTTOM_PADDING}px` }}>
          <span>7</span>
          <span>6</span>
          <span>5</span>
          <span>4</span>
          <span>3</span>
          <span>2</span>
          <span>1</span>
        </div>
        
        <div className="absolute left-12 right-4 top-4 flex flex-col justify-between pointer-events-none" style={{ height: `${CHART_HEIGHT - BOTTOM_PADDING}px` }}>
          {[7, 6, 5, 4, 3, 2, 1].map((level) => (
            <div key={level} className="w-full h-px bg-slate-100" />
          ))}
        </div>
        
        <div 
          ref={contentRef} 
          className="relative flex items-start ml-8" 
          style={{ minHeight: `${CHART_HEIGHT}px` }}
        >
          <svg 
            className="absolute top-0 left-0 pointer-events-none z-0 overflow-visible"
            width={svgDimensions.width || '100%'}
            height={svgDimensions.height || '100%'}
            style={{ minWidth: '100%', minHeight: '100%' }}
          >
            {pathD && (
              <motion.path
                d={pathD}
                stroke="#6366f1"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                fill="none"
                opacity="0.6"
                initial={hasInitialized ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={hasInitialized 
                  ? { duration: 0.3, ease: "easeOut" } 
                  : { duration: 1.2, ease: "easeOut" }
                }
              />
            )}
          </svg>
          
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
                      className="flex-shrink-0 w-[180px] sm:w-[200px] md:w-[225px] relative"
                      style={{ height: `${CHART_HEIGHT}px`, paddingBottom: `${BOTTOM_PADDING}px` }}
                    >
                      <motion.div 
                        data-emotion-dot
                        className="absolute z-20"
                        animate={{
                          top: `${yPosition}%`,
                        }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 300, 
                          damping: 25,
                          mass: 0.8
                        }}
                        style={{
                          left: '50%',
                          transform: 'translate(-50%, -50%)'
                        }}
                        onAnimationComplete={updateSparkline}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-10 w-10 p-0 rounded-full border-2 shadow-md hover:scale-110 transition-transform text-white font-bold text-base"
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
                      
                      <div className="absolute bottom-1 left-0 right-0 text-center px-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">
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
