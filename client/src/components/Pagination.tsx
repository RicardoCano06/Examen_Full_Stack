import type { ReactNode } from 'react';
import Button from './Button';

interface Props {
  page: number;
  totalPages: number;
  counter?: string;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export default function Pagination({ page, totalPages, counter, onFirst, onPrev, onNext, onLast }: Props) {
  return (
    <div className="mt-4 flex items-center gap-2">
      <Button variant="secondary" className="h-9 px-2.5" disabled={page <= 1} onClick={onFirst} aria-label="Primera página" title="Primera página">
        <Icon><><path d="m11 17-5-5 5-5" /><path d="m18 17-5-5 5-5" /></></Icon>
      </Button>
      <Button variant="secondary" className="h-9 px-2.5" disabled={page <= 1} onClick={onPrev} aria-label="Página anterior" title="Anterior">
        <Icon><path d="m15 18-6-6 6-6" /></Icon>
      </Button>
      <span className="px-1 text-sm text-slate-500">Página {page} de {totalPages}</span>
      {counter && <span className="text-sm text-slate-400">{counter}</span>}
      <Button variant="secondary" className="h-9 px-2.5" disabled={page >= totalPages} onClick={onNext} aria-label="Página siguiente" title="Siguiente">
        <Icon><path d="m9 18 6-6-6-6" /></Icon>
      </Button>
      <Button variant="secondary" className="h-9 px-2.5" disabled={page >= totalPages} onClick={onLast} aria-label="Última página" title="Última página">
        <Icon><><path d="m13 17 5-5-5-5" /><path d="m6 17 5-5-5-5" /></></Icon>
      </Button>
    </div>
  );
}
