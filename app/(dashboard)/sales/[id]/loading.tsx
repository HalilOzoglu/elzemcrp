export default function SaleDetailLoading() {
  return (
    <div className="space-y-6 max-w-lg animate-pulse">
      <div className="h-4 w-16 rounded bg-muted" />
      <div className="h-6 w-32 rounded bg-muted" />
      <div className="rounded-lg border p-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="h-4 w-32 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-9 w-full rounded bg-muted" />
          </div>
        ))}
        <div className="h-9 w-24 rounded bg-muted" />
      </div>
    </div>
  )
}
