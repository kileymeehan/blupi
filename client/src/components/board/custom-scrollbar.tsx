import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface CustomScrollbarProps {
  scrollContainer: HTMLElement | null;
}

export function CustomScrollbar({ scrollContainer }: CustomScrollbarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [thumbPosition, setThumbPosition] = useState(0);
  const [thumbWidth, setThumbWidth] = useState(100);
  const [mounted, setMounted] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!scrollContainer) return;

    const updateScrollbar = () => {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
      const trackWidth = window.innerWidth; // Full width, no margins
      
      // Calculate thumb width as a percentage of visible area
      const visibleRatio = clientWidth / scrollWidth;
      const calculatedThumbWidth = Math.max(trackWidth * visibleRatio, 60);
      setThumbWidth(calculatedThumbWidth);

      // Calculate thumb position
      const maxScrollLeft = scrollWidth - clientWidth;
      const scrollRatio = maxScrollLeft > 0 ? scrollLeft / maxScrollLeft : 0;
      const maxThumbPosition = trackWidth - calculatedThumbWidth;
      setThumbPosition(scrollRatio * maxThumbPosition);
    };

    updateScrollbar();
    scrollContainer.addEventListener('scroll', updateScrollbar);
    window.addEventListener('resize', updateScrollbar);

    return () => {
      scrollContainer.removeEventListener('scroll', updateScrollbar);
      window.removeEventListener('resize', updateScrollbar);
    };
  }, [scrollContainer]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !scrollContainer || !trackRef.current) return;

    const trackRect = trackRef.current.getBoundingClientRect();
    const relativeX = e.clientX - trackRect.left;
    const trackWidth = trackRect.width;
    const maxThumbPosition = trackWidth - thumbWidth;
    
    const newThumbPosition = Math.max(0, Math.min(relativeX - thumbWidth / 2, maxThumbPosition));
    const scrollRatio = newThumbPosition / maxThumbPosition;
    
    const { scrollWidth, clientWidth } = scrollContainer;
    const maxScrollLeft = scrollWidth - clientWidth;
    const newScrollLeft = scrollRatio * maxScrollLeft;
    
    scrollContainer.scrollLeft = newScrollLeft;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isDragging, thumbWidth]);

  const handleTrackClick = (e: React.MouseEvent) => {
    if (!scrollContainer || !trackRef.current) return;

    const trackRect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - trackRect.left;
    const trackWidth = trackRect.width;
    const maxThumbPosition = trackWidth - thumbWidth;
    
    const newThumbPosition = Math.max(0, Math.min(clickX - thumbWidth / 2, maxThumbPosition));
    const scrollRatio = newThumbPosition / maxThumbPosition;
    
    const { scrollWidth, clientWidth } = scrollContainer;
    const maxScrollLeft = scrollWidth - clientWidth;
    const newScrollLeft = scrollRatio * maxScrollLeft;
    
    scrollContainer.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
  };

  if (!scrollContainer || !mounted) return null;

  const scrollbarElement = (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#0A0A0F] h-5"
      style={{ zIndex: 99999 }}
    >
      <div
        ref={trackRef}
        className="relative h-full w-full cursor-pointer"
        onClick={handleTrackClick}
      >
        <div
          className="absolute top-0 h-full cursor-grab hover:brightness-105 transition-all duration-200"
          style={{
            left: `${thumbPosition}px`,
            width: `${thumbWidth}px`,
            cursor: isDragging ? 'grabbing' : 'grab',
            backgroundColor: '#FFD600',
            borderRight: '2px solid #0A0A0F',
            borderLeft: '2px solid #0A0A0F',
            borderRadius: '0px',
            backgroundImage: `
              radial-gradient(circle, rgba(10, 10, 15, 0.15) 0.5px, transparent 0.5px)
            `,
            backgroundSize: '4px 4px',
            backgroundPosition: 'center center'
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Grip lines for tactile affordance */}
          <div className="absolute inset-0 flex items-center justify-center gap-0.5 pointer-events-none">
            <div className="w-px h-2.5 bg-[#0A0A0F] opacity-20 rounded-full" />
            <div className="w-px h-2.5 bg-[#0A0A0F] opacity-20 rounded-full" />
            <div className="w-px h-2.5 bg-[#0A0A0F] opacity-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(scrollbarElement, document.body);
}