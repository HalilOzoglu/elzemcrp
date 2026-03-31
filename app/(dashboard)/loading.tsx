export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Title skeleton */}
      <div className="h-7 w-32 animate-pulse rounded-md bg-muted" />

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-5 shadow-sm"
          >
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-9 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Low stock section skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-5 w-12 animate-pulse rounded-full bg-muted" />
              </div>
              <div className="mt-2 h-3 w-32 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
