import type { ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  breadcrumb?: string[];
  actions?: ReactNode;
}

export default function PageHeader({ title, description, breadcrumb, actions }: Props) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        {breadcrumb && (
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">
            {breadcrumb.join('  /  ')}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
