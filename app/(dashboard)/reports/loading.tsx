export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      {/* Title skeleton */}
      <div className="h-7 w-24 animate-pulse rounded-md bg-muted" />

      {/* Date filter skeleton */}
      <div className="flex gap-4">
        <div className="h-9 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-40 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Chart skeleton */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="h-5 w-48 animate-pulse rounded bg-muted mb-4" />
        <div className="h-64 w-full animate-pulse rounded bg-muted" />
      </div>

      {/* Monthly table skeleton */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-3">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Stock value skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="h-4 w-36 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-8 w-28 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Low stock skeleton */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-3">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex justify-between">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
