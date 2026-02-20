export function DocumentCardSkeleton() {
  return (
    <div className="marketplace-card flex flex-col h-full overflow-hidden">
      {/* Preview Skeleton */}
      <div className="marketplace-preview h-60 flex items-center justify-center skeleton-pulse">
        <div className="w-16 h-16 rounded bg-muted-foreground/10" />
      </div>

      {/* Body Skeleton */}
      <div className="flex flex-col p-5 space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <div className="h-5 bg-muted rounded skeleton-pulse w-3/4" />
          <div className="h-5 bg-muted rounded skeleton-pulse w-1/2" />
        </div>

        {/* Description */}
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-muted rounded skeleton-pulse w-full" />
          <div className="h-4 bg-muted rounded skeleton-pulse w-5/6" />
        </div>

        {/* Metadata */}
        <div className="h-3 bg-muted rounded skeleton-pulse w-1/3" />

        {/* Button */}
        <div className="h-10 bg-muted rounded-lg skeleton-pulse w-full" />
      </div>
    </div>
  );
}