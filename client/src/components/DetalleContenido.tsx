import { useEffect, useState } from 'react';
import { obtenerPersona, type Persona } from '../api/client';
import Avatar from './Avatar';
import Card from './Card';
import { Spinner } from './Spinner';
import { useToast } from './Toast';
import { puntosMiles, soloFecha } from '../utils/format';

function base(ruta: string): string {
  return ruta.split('/').pop() || '';
}

export default function DetalleContenido({ id }: { id: string }) {
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
      <Card className="mb-4 p-6">
        <div className="mb-4 flex items-center gap-4">
          <Avatar nombres={persona.nombres} apellidos={persona.apellidos} />
          <div>
            <p className="text-lg font-semibold text-slate-900">{persona.apellidos}, {persona.nombres}</p>
          </div>
        </div>
        <div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Documento</dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-900">{puntosMiles(persona.nro_documento)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Nacimiento</dt>
              <dd className="mt-0.5 text-slate-900">{soloFecha(persona.fecha_nacimiento)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Edad</dt>
              <dd className="mt-0.5 text-slate-900">{persona.edad ?? '—'}</dd>
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
            <img src={`/uploads/${base(f.ruta)}`} alt={`Documento ${f.titulo}`} className="aspect-[85.6/54] w-full rounded-lg object-cover ring-1 ring-slate-900/5" />
          </Card>
        ))}
      </div>
    </div>
  );
}
