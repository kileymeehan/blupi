import { useState, useEffect, useRef } from 'react';

interface CustomScrollbarProps {
  scrollContainer: HTMLElement | null;
}

export function CustomScrollbar({ scrollContainer }: CustomScrollbarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [thumbPosition, setThumbPosition] = useState(0);
  const [thumbWidth, setThumbWidth] = useState(100);
  const trackRef = useRef<HTMLDivElement>(null);

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

  if (!scrollContainer) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-200 border-t-2 border-gray-300 h-5">
      <div
        ref={trackRef}
        className="relative h-full w-full cursor-pointer"
        onClick={handleTrackClick}
      >
        <div
          className="absolute top-0 h-full cursor-grab hover:brightness-110 transition-all duration-200"
          style={{
            left: `${thumbPosition}px`,
            width: `${thumbWidth}px`,
            cursor: isDragging ? 'grabbing' : 'grab',
            background: 'linear-gradient(135deg, #a855f7 0%, #8b5cf6 50%, #7c3aed 100%)',
            boxShadow: '0 -2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.1)',
            borderRadius: '0px'
          }}
          onMouseDown={handleMouseDown}
        />
      </div>
    </div>
  );
}