export default function HomeLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-1">
        <div className="h-7 w-40 bg-surface rounded" />
        <div className="h-4 w-56 bg-surface rounded" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-surface p-5 space-y-4">
            <div className="flex justify-between">
              <div className="h-5 w-36 bg-bg rounded" />
              <div className="h-4 w-16 bg-bg rounded" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-1">
                  <div className="h-3 w-12 bg-bg rounded" />
                  <div className="h-5 w-20 bg-bg rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
