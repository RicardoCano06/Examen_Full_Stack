import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Personas', end: true },
  { to: '/registrar', label: 'Registrar' },
  { to: '/buscar', label: 'Buscar' },
  { to: '/auditoria', label: 'Auditoría' },
];

export default function Sidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-shrink-0 flex-col bg-slate-950 text-slate-100">
      <div className="px-5 py-5">
        <p className="text-lg font-bold tracking-tight">Examen Full Stack</p>
        <p className="text-xs text-slate-400">Backoffice</p>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `rounded px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto px-5 py-4 text-xs text-slate-500">Registro · Búsqueda · Auditoría</div>
    </aside>
  );
}
