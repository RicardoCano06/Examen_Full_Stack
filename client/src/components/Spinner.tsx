import Table from './Table';

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

export function TableCardSkeleton({ headers, rows = 10, avatar = false }: { headers: string[]; rows?: number; avatar?: boolean }) {
  return (
    <Table headers={headers}>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse" aria-hidden="true">
          {headers.map((h, j) => (
            <td key={h} className="px-4 py-3">
              {avatar && j === 0 ? (
                <span className="flex items-center gap-3">
                  <span className="h-9 w-9 shrink-0 rounded-full bg-slate-200" />
                  <span className="h-4 flex-1 rounded bg-slate-200" />
                </span>
              ) : (
                <div className="h-4 rounded bg-slate-200" />
              )}
            </td>
          ))}
        </tr>
      ))}
    </Table>
  );
}
