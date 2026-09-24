import type { ReactNode } from 'react';

export default function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-900/5">
      <p className="text-sm text-slate-500">{message}</p>
      {action}
    </div>
  );
}
