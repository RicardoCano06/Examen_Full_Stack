import { NavLink } from 'react-router-dom';

const SECTIONS: { titulo: string; links: { to: string; label: string; end?: boolean }[] }[] = [
  { titulo: 'Gestión', links: [{ to: '/', label: 'Personas', end: true }, { to: '/registrar', label: 'Registrar' }] },
  { titulo: 'Sistema', links: [{ to: '/auditoria', label: 'Auditoría' }] },
];

export default function Sidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-shrink-0 flex-col bg-white text-slate-700">
      <div className="flex items-center gap-3 px-5 py-5">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white" aria-hidden="true">
          EC
        </span>
        <div>
          <p className="text-sm font-semibold tracking-tight text-slate-900">Examen Full Stack</p>
          <p className="text-xs text-slate-500">Backoffice corporativo</p>
        </div>
      </div>
      <nav className="flex flex-col gap-4 overflow-y-auto px-3">
        {SECTIONS.map((s) => (
          <div key={s.titulo}>
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{s.titulo}</p>
            <div className="flex flex-col gap-1">
              {s.links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
