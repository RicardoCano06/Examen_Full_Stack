import type { ReactNode } from 'react';

interface Props {
  headers: string[];
  children: ReactNode;
}

export default function Table({ headers, children }: Props) {
  return (
    <div className="w-full bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="border-b bg-gray-50 text-left text-gray-600">
            {headers.map((h) => (
              <th key={h} className="p-3 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
