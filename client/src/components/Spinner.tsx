export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-gray-500" role="status">
      <svg className="h-4 w-4 animate-spin text-gray-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      {label}
    </span>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2 border-b border-gray-100 py-3">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 flex-1 rounded bg-gray-200" />
          ))}
        </div>
      ))}
    </div>
  );
}
