import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]", className)}
      style={{
        animation: "shimmer 2s infinite linear"
      }}
      {...props}
    />
  )
}

// Enhanced skeleton components for different use cases
export const CardSkeleton = () => (
  <div className="space-y-4 p-6 border rounded-xl">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
    <Skeleton className="h-8 w-1/4" />
  </div>
)

export const TaskSkeleton = () => (
  <div className="flex items-start justify-between p-4 border rounded-xl space-x-4">
    <div className="flex-1 space-y-3">
      <Skeleton className="h-4 w-4/5" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
    <div className="flex items-center gap-3">
      <div className="text-right space-y-1">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-10 w-10 rounded-full" />
    </div>
  </div>
)

export const StatCardSkeleton = () => (
  <div className="p-6 border rounded-xl space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
    <Skeleton className="h-8 w-16" />
    <div className="flex items-center gap-2">
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-3 w-16" />
    </div>
  </div>
)

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/6" />
        <Skeleton className="h-4 w-1/6" />
        <Skeleton className="h-4 w-1/8" />
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>
    ))}
  </div>
)

export const DashboardSkeleton = () => (
  <div className="space-y-8">
    {/* Header Skeleton */}
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-orange-400/5 to-transparent rounded-2xl blur-3xl"></div>
      <div className="relative bg-gradient-to-r from-orange-50 to-orange-100/50 rounded-2xl p-8 border border-orange-200/50">
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-6 w-80 mb-4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    </div>

    {/* Stats Grid Skeleton */}
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>

    {/* Content Grid Skeleton */}
    <div className="grid gap-6 lg:grid-cols-2">
      <CardSkeleton />
      <CardSkeleton />
    </div>
  </div>
)

export { Skeleton }