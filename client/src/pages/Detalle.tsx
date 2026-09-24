import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { obtenerPersona, type Persona } from '../api/client';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
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
  if (!persona) return <p className="text-sm text-slate-500">Persona no encontrada.</p>;

  return (
    <div>
      <PageHeader
        title={`${persona.nombres} ${persona.apellidos}`}
        description={`Documento ${persona.nro_documento}`}
        actions={
          <>
            <Link to={`/editar/${persona.id}`}>
              <Button variant="secondary">Editar</Button>
            </Link>
            <Link to="/">
              <Button variant="secondary">Volver</Button>
            </Link>
          </>
        }
      />
      <Card className="mb-4 p-6">
        <div className="flex items-center gap-4">
          <Avatar nombres={persona.nombres} apellidos={persona.apellidos} />
          <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Documento</dt>
              <dd className="mt-0.5 font-mono text-[13px] text-slate-900">{persona.nro_documento}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Nacimiento</dt>
              <dd className="mt-0.5 text-slate-900">{soloFecha(persona.fecha_nacimiento)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Edad</dt>
              <dd className="mt-0.5 text-slate-900">{persona.edad ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Registro</dt>
              <dd className="mt-0.5 font-mono text-[13px] text-slate-500">{persona.id.slice(0, 8)}…</dd>
            </div>
          </dl>
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { titulo: 'Cédula · frente', ruta: persona.ruta_foto_frente },
          { titulo: 'Cédula · dorso', ruta: persona.ruta_foto_dorso },
        ].map((f) => (
          <Card key={f.titulo} className="p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{f.titulo}</p>
            <img src={`/uploads/${base(f.ruta)}`} alt={`Documento ${f.titulo}`} className="aspect-[85.6/54] w-full rounded-lg object-cover ring-1 ring-slate-200" />
          </Card>
        ))}
      </div>
    </div>
  );
}
