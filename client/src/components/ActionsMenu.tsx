import { useEffect, useRef, useState } from 'react';

interface Item {
  label: string;
  tone?: 'default' | 'danger';
  onSelect: () => void;
}

export default function ActionsMenu({ items, label = 'Acciones' }: { items: Item[]; label?: string }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [abierto]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-label={label}
        aria-expanded={abierto}
        className="rounded-lg px-2 py-1 text-lg leading-none text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        ⋮
      </button>
      {abierto && (
        <div className="absolute right-0 z-20 w-36 rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-900/10">
          {items.map((it) => (
            <button
              key={it.label}
              onClick={() => { setAbierto(false); it.onSelect(); }}
              className={`block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                it.tone === 'danger' ? 'text-red-600' : 'text-slate-700'
              }`}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
