import { useState, type FormEvent } from 'react';
import { api } from '../api/client';

export default function Registrar() {
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [documento, setDocumento] = useState('');
  const [fecha, setFecha] = useState('');
  const [frente, setFrente] = useState<File | null>(null);
  const [dorso, setDorso] = useState<File | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMensaje('');
    setError('');
    if (!frente || !dorso) {
      setError('Debe adjuntar foto_frente y foto_dorso');
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
    try {
      // No fijar Content-Type manualmente: el navegador agrega el boundary.
      await api.post('/personas', form);
      setMensaje('Persona registrada correctamente');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const r = (err as { response?: { status?: number; data?: { error?: string } } }).response;
        setError(r?.data?.error || `Error ${r?.status || ''} al registrar`);
      } else {
        setError('Error de red al registrar');
      }
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Registrar persona</h1>
      <form onSubmit={(e) => void onSubmit(e)} className="flex max-w-lg flex-col gap-3 rounded bg-white p-4 shadow">
        <input className="rounded border px-3 py-2" placeholder="Nombres" value={nombres} onChange={(e) => setNombres(e.target.value)} required />
        <input className="rounded border px-3 py-2" placeholder="Apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} required />
        <input className="rounded border px-3 py-2" placeholder="Nro. documento" value={documento} onChange={(e) => setDocumento(e.target.value)} required />
        <input className="rounded border px-3 py-2" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        <label className="text-sm">
          Foto frente (JPEG/PNG/WEBP, máx. 5MB)
          <input className="mt-1 block" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFrente(e.target.files?.[0] || null)} required />
        </label>
        <label className="text-sm">
          Foto dorso (JPEG/PNG/WEBP, máx. 5MB)
          <input className="mt-1 block" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setDorso(e.target.files?.[0] || null)} required />
        </label>
        <button className="rounded bg-blue-600 px-4 py-2 text-white" type="submit">Registrar</button>
        {mensaje && <p className="text-green-600">{mensaje}</p>}
        {error && <p className="text-red-600">{error}</p>}
      </form>
    </div>
  );
}
