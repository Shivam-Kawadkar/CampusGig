import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  count?: number;
  size?: number;
  className?: string;
}

export function RatingStars({
  rating,
  count,
  size = 14,
  className,
}: RatingStarsProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Star
        className="fill-warning text-warning"
        style={{ width: size, height: size }}
      />
      <span className="text-sm font-medium tabular-nums">
        {rating.toFixed(1)}
      </span>
      {count !== undefined && (
        <span className="text-xs text-muted-foreground">({count})</span>
      )}
    </div>
  );
}
