export default function ContactDetailLoading() {
  return (
    <div className="space-y-8 max-w-3xl animate-pulse">
      <div className="h-4 w-16 rounded bg-muted" />
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-6 w-40 rounded bg-muted" />
          <div className="h-4 w-28 rounded bg-muted" />
        </div>
        <div className="h-6 w-16 rounded-full bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-5 w-full rounded bg-muted" />
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-4 w-32 rounded bg-muted" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-md border px-4 py-3 flex justify-between">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-4 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
