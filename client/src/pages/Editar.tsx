import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, obtenerPersona } from '../api/client';
import Button from '../components/Button';
import Card from '../components/Card';
import Input, { INPUT_CLASS } from '../components/Input';
import PageHeader from '../components/PageHeader';
import { Spinner } from '../components/Spinner';
import { useToast } from '../components/Toast';

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{titulo}</legend>
      <div className="flex flex-col gap-4">{children}</div>
    </fieldset>
  );
}

export default function Editar() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [documento, setDocumento] = useState('');
  const [fecha, setFecha] = useState('');
  const [frente, setFrente] = useState<File | null>(null);
  const [dorso, setDorso] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await obtenerPersona(id);
        setNombres(p.nombres);
        setApellidos(p.apellidos);
        setDocumento(p.nro_documento);
        setFecha(p.fecha_nacimiento.slice(0, 10));
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
      navigate(`/personas/${id}`);
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
    <div>
      <PageHeader title="Editar persona" description="Modificación atómica con reemplazo opcional de fotos" />
      <form onSubmit={(e) => void onSubmit(e)}>
        <Card className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
          <Seccion titulo="Datos personales">
            <Input label="Nombres" value={nombres} onChange={(e) => setNombres(e.target.value)} required />
            <Input label="Apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} required />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Nro. documento" value={documento} onChange={(e) => setDocumento(e.target.value)} required />
              <Input label="Fecha de nacimiento" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </div>
          </Seccion>
          <Seccion titulo="Reemplazo de fotos (opcional)">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Frente · se conserva la actual si se omite</span>
              <input
                className={INPUT_CLASS}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setFrente(e.target.files?.[0] || null)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Dorso · se conserva la actual si se omite</span>
              <input
                className={INPUT_CLASS}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setDorso(e.target.files?.[0] || null)}
              />
            </label>
          </Seccion>
          <Button type="submit" loading={sending}>Guardar cambios</Button>
        </Card>
      </form>
    </div>
  );
}
