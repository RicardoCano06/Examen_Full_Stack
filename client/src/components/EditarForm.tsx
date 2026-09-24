import { useEffect, useState, type FormEvent } from 'react';
import { api, obtenerPersona } from '../api/client';
import Button from './Button';
import FechaInput from './FechaInput';
import FileDrop from './FileDrop';
import Input from './Input';
import { Spinner } from './Spinner';
import { useToast } from './Toast';

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{titulo}</legend>
      <div className="flex flex-col gap-4">{children}</div>
    </fieldset>
  );
}

export default function EditarForm({ id, onSaved }: { id: string; onSaved: () => void }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [documento, setDocumento] = useState('');
  const [fecha, setFecha] = useState('');
  const [frente, setFrente] = useState<File | null>(null);
  const [dorso, setDorso] = useState<File | null>(null);
  const [fotoFrenteActual, setFotoFrenteActual] = useState('');
  const [fotoDorsoActual, setFotoDorsoActual] = useState('');
  const [sending, setSending] = useState(false);

  function base(ruta: string): string {
    return ruta.split('/').pop() || '';
  }

  useEffect(() => {
    (async () => {
      try {
        const p = await obtenerPersona(id);
        setNombres(p.nombres);
        setApellidos(p.apellidos);
        setDocumento(p.nro_documento);
        setFecha(p.fecha_nacimiento.slice(0, 10));
        setFotoFrenteActual(p.ruta_foto_frente || '');
        setFotoDorsoActual(p.ruta_foto_dorso || '');
      } catch {
        toast('error', 'No se pudo cargar la persona');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fecha) {
      toast('error', 'Ingrese una fecha de nacimiento válida (DD/MM/AAAA)');
      return;
    }
    // Mismo FormData atómico que el registro; las fotos son opcionales:
    // solo se reemplaza el lado enviado, el resto se conserva.
    const form = new FormData();
    form.append('nombres', nombres);
    form.append('apellidos', apellidos);
    form.append('nro_documento', documento);
    form.append('fecha_nacimiento', fecha);
    if (frente) form.append('foto_frente', frente);
    if (dorso) form.append('foto_dorso', dorso);
    setSending(true);
    try {
      await api.put(`/personas/${id}`, form);
      toast('success', 'Persona actualizada correctamente');
      onSaved();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const r = (err as { response?: { status?: number; data?: { error?: string } } }).response;
        toast('error', r?.data?.error || `Error ${r?.status || ''} al actualizar`);
      } else {
        toast('error', 'Error de red al actualizar');
      }
    } finally {
      setSending(false);
    }
  }

  if (loading) return <Spinner label="Cargando persona…" />;

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-6">
      <Seccion titulo="Datos personales">
        <Input label="Nombres" value={nombres} onChange={(e) => setNombres(e.target.value)} maxLength={100} required />
        <Input label="Apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} maxLength={100} required />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Nro. documento" value={documento} onChange={(e) => setDocumento(e.target.value)} maxLength={20} required />
          <FechaInput label="Fecha de nacimiento" value={fecha} onChange={setFecha} required />
        </div>
      </Seccion>
      <Seccion titulo="Reemplazo de fotos (opcional)">
        {(fotoFrenteActual || fotoDorsoActual) && (
          <div className="flex gap-4">
            {[
              { titulo: 'Foto actual · frente', ruta: fotoFrenteActual },
              { titulo: 'Foto actual · dorso', ruta: fotoDorsoActual },
            ].filter((f) => f.ruta).map((f) => (
              <figure key={f.titulo} className="flex items-center gap-2">
                <img src={`/uploads/${base(f.ruta)}`} alt={f.titulo} className="aspect-[85.6/54] w-24 rounded-lg object-cover ring-1 ring-slate-900/10" />
                <figcaption className="text-xs text-slate-500">{f.titulo}</figcaption>
              </figure>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FileDrop label="Frente · se conserva la actual si se omite" file={frente} onChange={setFrente} />
          <FileDrop label="Dorso · se conserva la actual si se omite" file={dorso} onChange={setDorso} />
        </div>
      </Seccion>
      <Button type="submit" loading={sending}>Guardar cambios</Button>
    </form>
  );
}
