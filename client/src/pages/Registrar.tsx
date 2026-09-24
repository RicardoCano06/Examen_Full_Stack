import { useState, type FormEvent } from 'react';
import { api } from '../api/client';
import Button from '../components/Button';
import Card from '../components/Card';
import Input, { INPUT_CLASS } from '../components/Input';
import PageHeader from '../components/PageHeader';
import { useToast } from '../components/Toast';

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{titulo}</legend>
      <div className="flex flex-col gap-4">{children}</div>
    </fieldset>
  );
}

export default function Registrar() {
  const toast = useToast();
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [documento, setDocumento] = useState('');
  const [fecha, setFecha] = useState('');
  const [frente, setFrente] = useState<File | null>(null);
  const [dorso, setDorso] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  function limpiar() {
    setNombres('');
    setApellidos('');
    setDocumento('');
    setFecha('');
    setFrente(null);
    setDorso(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!frente || !dorso) {
      toast('error', 'Debe adjuntar foto_frente y foto_dorso');
      return;
    }
    // Un único FormData con textos + 2 archivos en la misma petición POST.
    const form = new FormData();
    form.append('nombres', nombres);
    form.append('apellidos', apellidos);
    form.append('nro_documento', documento);
    form.append('fecha_nacimiento', fecha);
    form.append('foto_frente', frente);
    form.append('foto_dorso', dorso);
    setSending(true);
    try {
      // No fijar Content-Type manualmente: el navegador agrega el boundary.
      await api.post('/personas', form);
      toast('success', 'Persona registrada correctamente');
      limpiar();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const r = (err as { response?: { status?: number; data?: { error?: string } } }).response;
        toast('error', r?.data?.error || `Error ${r?.status || ''} al registrar`);
      } else {
        toast('error', 'Error de red al registrar');
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Registrar persona"
        breadcrumb={['Inicio', 'Personas', 'Registrar']}
        description="Alta atómica: datos y ambas fotos en una sola petición"
      />
      <form onSubmit={(e) => void onSubmit(e)}>
        <Card className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400" aria-hidden="true">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M19 8v6M22 11h-6" />
              </svg>
            </span>
            <div>
              <p className="font-semibold text-slate-900">Nuevo registro</p>
              <p className="text-sm text-slate-500">Complete todos los campos obligatorios</p>
            </div>
          </div>
          <Seccion titulo="Datos personales">
            <Input label="Nombres" value={nombres} onChange={(e) => setNombres(e.target.value)} required />
            <Input label="Apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} required />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Nro. documento" value={documento} onChange={(e) => setDocumento(e.target.value)} required />
              <Input label="Fecha de nacimiento" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </div>
          </Seccion>
          <Seccion titulo="Documento de identidad">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Foto frente · JPEG/PNG/WEBP · máx. 5 MB</span>
              <input
                className={INPUT_CLASS}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setFrente(e.target.files?.[0] || null)}
                required
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Foto dorso · JPEG/PNG/WEBP · máx. 5 MB</span>
              <input
                className={INPUT_CLASS}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setDorso(e.target.files?.[0] || null)}
                required
              />
            </label>
          </Seccion>
          <Button type="submit" loading={sending}>Registrar persona</Button>
        </Card>
      </form>
    </div>
  );
}
