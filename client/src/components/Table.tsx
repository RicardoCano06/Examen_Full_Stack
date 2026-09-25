import type { ReactNode } from 'react';

export type Header = string | { label: string; center?: boolean };

interface Props {
  headers: Header[];
  children: ReactNode;
}

function labelOf(h: Header): string {
  return typeof h === 'string' ? h : h.label;
}

function centered(h: Header): boolean {
  return typeof h !== 'string' && !!h.center;
}

export default function Table({ headers, children }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl bg-white text-sm shadow-sm ring-1 ring-slate-900/5">
      <table className="min-w-full divide-y divide-slate-100">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-100">
            {headers.map((h) => (
              <th key={labelOf(h)} scope="col" className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600${centered(h) ? ' text-center' : ' text-left'}`}>{labelOf(h)}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}
