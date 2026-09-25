import { useLocation } from 'react-router-dom';

function saludo(): string {
  const h = new Date().getHours();
  if (h < 12) return 'BUENOS DÍAS';
  if (h < 20) return 'BUENAS TARDES';
  return 'BUENAS NOCHES';
}

function tituloPorRuta(pathname: string): { titulo: string; subtitulo: string } {
  if (pathname === '/') return { titulo: 'Personas', subtitulo: 'Registro de personas con documento de identidad' };
  if (pathname === '/auditoria') return { titulo: 'Auditoría', subtitulo: 'Trazabilidad de consultas por IP y notificación' };
  if (pathname.startsWith('/editar/')) return { titulo: 'Editar persona', subtitulo: 'Actualice los datos o reemplace las fotos' };
  if (pathname.startsWith('/personas/')) return { titulo: 'Detalle de persona', subtitulo: 'Ficha con documento de identidad' };
  return { titulo: 'Panel', subtitulo: '' };
}

export default function Topbar() {
  const { pathname } = useLocation();
  const { titulo, subtitulo } = tituloPorRuta(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-8 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {saludo()}, RICARDO CANO
      </p>
      <div className="mt-1 flex items-center gap-3">
        <span className="inline-grid grid-cols-2 gap-0.5 text-blue-600" aria-hidden="true">
          <span className="h-2 w-2 rounded-[2px] bg-current" />
          <span className="h-2 w-2 rounded-[2px] bg-current" />
          <span className="h-2 w-2 rounded-[2px] bg-current" />
          <span className="h-2 w-2 rounded-[2px] bg-current" />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{titulo}</h1>
          {subtitulo && <p className="text-sm text-slate-500">{subtitulo}</p>}
        </div>
      </div>
    </header>
  );
}
