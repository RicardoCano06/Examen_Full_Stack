import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { obtenerPersona, type Persona } from '../api/client';
import Button from '../components/Button';
import { Spinner } from '../components/Spinner';
import { useToast } from '../components/Toast';

function base(ruta: string): string {
  return ruta.split('/').pop() || '';
}

function soloFecha(iso: string): string {
  const base10 = iso.slice(0, 10);
  const [y, m, d] = base10.split('-').map(Number);
  if (!y || !m || !d) return base10;
  return new Date(y, m - 1, d).toLocaleDateString('es-PY');
}

export default function Detalle() {
  const { id = '' } = useParams();
  const toast = useToast();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setPersona(await obtenerPersona(id));
      } catch {
        toast('error', 'No se pudo cargar la persona');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <Spinner label="Cargando persona…" />;
  if (!persona) return <p className="text-sm text-gray-500">Persona no encontrada.</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">
        {persona.nombres} {persona.apellidos}
      </h1>
      <div className="mb-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <dt className="text-slate-500">Documento</dt><dd>{persona.nro_documento}</dd>
          <dt className="text-slate-500">Nacimiento</dt><dd>{soloFecha(persona.fecha_nacimiento)}</dd>
          <dt className="text-slate-500">Edad</dt><dd>{persona.edad ?? '—'}</dd>
        </dl>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { titulo: 'Frente', ruta: persona.ruta_foto_frente },
          { titulo: 'Dorso', ruta: persona.ruta_foto_dorso },
        ].map((f) => (
          <figure key={f.titulo} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <figcaption className="mb-2 text-sm font-medium text-slate-600">{f.titulo}</figcaption>
            <img src={`/uploads/${base(f.ruta)}`} alt={`Documento ${f.titulo}`} className="w-full rounded-lg" />
          </figure>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Link to={`/editar/${persona.id}`}>
          <Button variant="secondary">Editar</Button>
        </Link>
        <Link to="/">
          <Button variant="secondary">Volver</Button>
        </Link>
      </div>
    </div>
  );
}
