import { useState, useEffect, useRef, useCallback } from 'react';
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

const CHART_AREA_HEIGHT = 140;
const LABEL_HEIGHT = 28;

interface EmotionJourneyProps {
  phases: Phase[];
  board: Board;
  onEmotionChange: (phaseIndex: number, columnIndex: number, emotion: Emotion | null) => void;
  className?: string;
  singlePhaseIndex?: number;
}

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

export function EmotionJourney({ phases, board, onEmotionChange, className = '', singlePhaseIndex }: EmotionJourneyProps) {
  const isSinglePhase = singlePhaseIndex !== undefined;
  const displayPhases = isSinglePhase ? [phases[singlePhaseIndex]] : phases;
  const displayBoardPhases = isSinglePhase ? [board.phases[singlePhaseIndex]] : board.phases;
  const [pathD, setPathD] = useState<string>('');
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });
  const [hasInitialized, setHasInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const allColumns = displayPhases.flatMap((phase: Phase, localPhaseIndex: number) => 
    phase.columns.map((column: Column, columnIndex: number) => ({
      ...column,
      phaseIndex: isSinglePhase ? singlePhaseIndex : localPhaseIndex,
      localPhaseIndex,
      columnIndex,
      emotion: column.emotion
    }))
  );

  const getEmotionYPercent = (emotion: Emotion | undefined) => {
    if (!emotion) return 50;
    return 100 - ((emotion.value - 1) / 6) * 100;
  };

  const getEmotionYPixels = (emotion: Emotion | undefined) => {
    const percent = getEmotionYPercent(emotion);
    const padding = 20;
    const usableHeight = CHART_AREA_HEIGHT - (padding * 2);
    return padding + (percent / 100) * usableHeight;
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
    
    const dots: { x: number; y: number }[] = [];
    
    dotElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const x = (rect.left - contentRect.left) + (rect.width / 2);
      const y = (rect.top - contentRect.top) + (rect.height / 2);
      dots.push({ x, y });
    });
    
    if (dots.length > 0) {
      setSvgDimensions({ width: scrollWidth, height: CHART_AREA_HEIGHT });
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

  return (
    <div className={`w-full bg-white border-4 border-[#0A0A0F] rounded-none p-6 shadow-[6px_6px_0px_0px_#0A0A0F] overflow-hidden ${className}`} ref={containerRef}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black uppercase tracking-widest text-[#0A0A0F]">Emotional Journey</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-none border-2 border-[#0A0A0F] hover:bg-[#FFD600]">
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-white border-2 border-[#0A0A0F] rounded-none p-3 shadow-[4px_4px_0px_0px_#0A0A0F]">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 border border-[#0A0A0F]" />
                  <span className="text-[10px] font-black uppercase tracking-tight">1-3 Negative</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 border border-[#0A0A0F]" />
                  <span className="text-[10px] font-black uppercase tracking-tight">4 Neutral</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 border border-[#0A0A0F]" />
                  <span className="text-[10px] font-black uppercase tracking-tight">5-7 Positive</span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="relative bg-[#F8F9FA] rounded-none border-2 border-[#0A0A0F] overflow-hidden">
        <div 
          ref={contentRef} 
          className="relative flex items-start"
        >
          <svg 
            className="absolute top-0 left-0 pointer-events-none z-0"
            width={svgDimensions.width || '100%'}
            height={CHART_AREA_HEIGHT}
            style={{ minWidth: '100%' }}
          >
            {pathD && (
              <motion.path
                d={pathD}
                stroke="#0A0A0F"
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
                fill="none"
                opacity="0.8"
                initial={hasInitialized ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={hasInitialized 
                  ? { duration: 0.3, ease: "easeOut" } 
                  : { duration: 1.2, ease: "easeOut" }
                }
              />
            )}
          </svg>
          
          {displayBoardPhases.map((phase: Phase, localPhaseIndex: number) => {
            const actualPhaseIndex = isSinglePhase ? singlePhaseIndex : localPhaseIndex;
            return (
              <div key={phase.id} className="flex flex-shrink-0 last:mr-0">
                <div className="flex gap-4 md:gap-8">
                {phase.columns.map((column: Column, columnIndex: number) => {
                  const globalColumnIndex = displayBoardPhases.slice(0, localPhaseIndex).reduce((acc: number, p: Phase) => acc + p.columns.length, 0) + columnIndex;
                  const emotion = allColumns[globalColumnIndex]?.emotion;
                  const yPixels = getEmotionYPixels(emotion);
                  
                  return (
                    <div 
                      key={column.id} 
                      className="flex-shrink-0 w-[220px] sm:w-[240px] md:w-[270px] flex flex-col"
                    >
                      <div 
                        className="relative"
                        style={{ height: `${CHART_AREA_HEIGHT}px` }}
                      >
                        <motion.div 
                          data-emotion-dot
                          className="absolute z-20"
                          animate={{ top: yPixels }}
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
                                className="h-10 w-10 p-0 rounded-none border-4 border-[#0A0A0F] shadow-[4px_4px_0px_0px_#0A0A0F] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-white font-bold text-base"
                                style={{
                                  backgroundColor: emotion?.color || '#f8fafc',
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
                                  onClick={() => handleEmotionSelect(actualPhaseIndex, columnIndex, parseInt(value))}
                                  className="flex items-center gap-3 py-2"
                                >
                                  <div 
                                    className="w-5 h-5 rounded-none border-2 border-[#0A0A0F]" 
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
                                    onClick={() => handleRemoveEmotion(actualPhaseIndex, columnIndex)}
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
                      
                      <div 
                        className="text-center px-1 py-2 border-t border-slate-100 bg-white"
                        style={{ height: `${LABEL_HEIGHT}px` }}
                      >
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate">
                          {column.name || `Step ${columnIndex + 1}`}
                        </p>
                      </div>
                    </div>
                  );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
