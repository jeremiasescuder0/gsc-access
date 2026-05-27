export default function AccountLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Back link */}
      <div className="h-4 w-32 bg-surface rounded" />

      {/* Title */}
      <div className="space-y-2">
        <div className="h-7 w-56 bg-surface rounded" />
        <div className="h-4 w-40 bg-surface rounded" />
      </div>

      {/* Metrics + chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Metrics grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-surface p-4 space-y-2">
                <div className="h-3 w-16 bg-bg rounded" />
                <div className="h-6 w-24 bg-bg rounded" />
              </div>
            ))}
          </div>

          {/* Campaign table */}
          <div className="space-y-2">
            <div className="h-4 w-24 bg-surface rounded" />
            <div className="rounded-lg border border-border bg-surface overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4 px-4 py-3 border-b border-border last:border-0">
                  <div className="h-4 flex-1 bg-bg rounded" />
                  <div className="h-4 w-20 bg-bg rounded" />
                  <div className="h-4 w-20 bg-bg rounded" />
                  <div className="h-4 w-20 bg-bg rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-lg border border-border bg-surface h-80" />
        </div>
      </div>
    </div>
  );
}
