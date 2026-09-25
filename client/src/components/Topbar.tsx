import { useLocation } from 'react-router-dom';

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
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{titulo}</h1>
        {subtitulo && <p className="text-sm text-slate-500">{subtitulo}</p>}
      </div>
    </header>
  );
}
