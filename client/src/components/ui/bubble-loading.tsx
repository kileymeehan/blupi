import { cn } from "@/lib/utils";

interface BubbleLoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  message?: string;
}

export function BubbleLoading({ className, size = "md", message }: BubbleLoadingProps) {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4", 
    lg: "w-6 h-6"
  };

  const containerClasses = {
    sm: "gap-1",
    md: "gap-2",
    lg: "gap-3"
  };

  return (
    <div className={cn("flex flex-col items-center justify-center py-8", className)}>
      <div className={cn("flex items-center", containerClasses[size])}>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={cn(
              "rounded-full bg-gradient-to-br from-blue-400 to-blue-600 animate-bounce",
              sizeClasses[size]
            )}
            style={{
              animationDelay: `${index * 0.15}s`,
              animationDuration: "1s"
            }}
          />
        ))}
      </div>
      {message && (
        <p className="text-sm text-gray-500 mt-3 animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}