import { Sparkles } from 'lucide-react';

interface ComingSoonBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ComingSoonBadge({ size = 'sm', className = '' }: ComingSoonBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <span 
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        bg-gradient-to-r from-[#A1D9F5] to-[#F2918C] 
        text-[#302E87] shadow-sm border border-white/20
        ${sizeClasses[size]} ${className}
      `}
    >
      <Sparkles className={`${iconSizes[size]} animate-pulse`} />
      Coming Soon
    </span>
  );
}