import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface CustomScrollbarProps {
  scrollContainer: HTMLElement | null;
  darkMode?: boolean;
}

export function CustomScrollbar({ scrollContainer, darkMode = false }: CustomScrollbarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  // Where on the thumb it was grabbed, so it doesn't jump to center under the cursor
  const grabOffset = useRef(0);
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
    e.stopPropagation();
    grabOffset.current = e.clientX - e.currentTarget.getBoundingClientRect().left;
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !scrollContainer || !trackRef.current) return;

    const trackRect = trackRef.current.getBoundingClientRect();
    const relativeX = e.clientX - trackRect.left;
    const trackWidth = trackRect.width;
    const maxThumbPosition = trackWidth - thumbWidth;
    
    const newThumbPosition = Math.max(0, Math.min(relativeX - grabOffset.current, maxThumbPosition));
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

  // Nothing to scroll: hide the bar entirely
  if (thumbWidth >= window.innerWidth) return null;

  // Slim and neutral at rest, thicker and darker on hover or drag
  const active = isHovered || isDragging;
  const thumbColor = darkMode
    ? (active ? '#9CA3AF' : '#4B5563')
    : (active ? 'var(--card-border)' : 'var(--card-shadow)');

  const scrollbarElement = (
    <div
      className={`fixed bottom-0 left-0 right-0 h-4 border-t backdrop-blur-sm ${
        darkMode ? 'bg-[#1a1a2e]/80 border-white/10' : 'bg-white/80 border-gray-200'
      }`}
      style={{ zIndex: 99999 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        ref={trackRef}
        className="relative h-full w-full cursor-pointer"
        onClick={handleTrackClick}
        title="Drag to scroll sideways (or hold Space and drag the canvas)"
      >
        {/* Full-height hit area; the visible pill inside stays slim */}
        <div
          className="absolute top-0 h-full flex items-center px-0.5"
          style={{
            left: `${thumbPosition}px`,
            width: `${thumbWidth}px`,
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onMouseDown={handleMouseDown}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="w-full rounded-full transition-all duration-150"
            style={{ height: active ? 10 : 6, backgroundColor: thumbColor }}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(scrollbarElement, document.body);
}