import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-zinc-800/60',
        className
      )}
    />
  )
}

export function TaskSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-800/40">
      <Skeleton className="w-5 h-5 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-5 w-16" />
    </div>
  )
}

export function TaskSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <TaskSkeleton key={i} />
      ))}
    </div>
  )
}
