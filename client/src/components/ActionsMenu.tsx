import { useEffect, useRef, useState } from 'react';

interface Item {
  label: string;
  tone?: 'default' | 'danger';
  onSelect: () => void;
}

export default function ActionsMenu({ items, label = 'Acciones' }: { items: Item[]; label?: string }) {
  const [abierto, setAbierto] = useState(false);
  const [arriba, setArriba] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

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

  function alternar() {
    if (!abierto && btnRef.current) {
      // Se mide contra el contenedor con scroll de la tabla (no el viewport):
      // el menú nunca debe salir de la tabla.
      const btn = btnRef.current.getBoundingClientRect();
      const cont = btnRef.current.closest('.overflow-x-auto');
      const caja = cont ? cont.getBoundingClientRect() : null;
      const bordeInf = caja ? caja.bottom : window.innerHeight;
      const bordeSup = caja ? caja.top : 0;
      const altoMenu = items.length * 37 + 12;
      setArriba(bordeInf - btn.bottom < altoMenu && btn.top - bordeSup > altoMenu);
    }
    setAbierto((v) => !v);
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        ref={btnRef}
        onClick={alternar}
        aria-label={label}
        aria-expanded={abierto}
        aria-haspopup="menu"
        className="rounded-lg px-2 py-1 text-lg leading-none text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        ⋮
      </button>
      {abierto && (
        <div
          role="menu"
          className={`absolute right-0 z-20 w-36 rounded-xl bg-white py-1 shadow-xl ring-1 ring-slate-900/10 ${arriba ? 'bottom-full mb-1' : 'top-full mt-1'}`}
        >
          {items.map((it) => (
            <button
              key={it.label}
              role="menuitem"
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
