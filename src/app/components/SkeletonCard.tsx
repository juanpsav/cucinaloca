interface SkeletonCardProps {
  lines?: number;
  className?: string;
}

export default function SkeletonCard({ lines = 3, className = '' }: SkeletonCardProps) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-sage-green/10 rounded-full"
          style={{ width: `${85 - i * 15}%` }}
        />
      ))}
    </div>
  );
}
