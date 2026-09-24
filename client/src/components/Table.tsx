import type { ReactNode } from 'react';

interface Props {
  headers: string[];
  children: ReactNode;
}

export default function Table({ headers, children }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <table className="min-w-full divide-y divide-slate-100">
        <thead>
          <tr className="bg-slate-50/80">
            {headers.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}
