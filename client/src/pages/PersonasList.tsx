import { useEffect, useState } from 'react';
import { eliminarPersona, listarPersonas, type Persona } from '../api/client';

export default function PersonasList() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  async function cargar(p = page, q = search) {
    try {
      setError('');
      const res = await listarPersonas(p, 10, q);
      setPersonas(res.data);
      setTotalPages(res.totalPages || 1);
    } catch {
      setError('No se pudo cargar el listado');
    }
  }

  useEffect(() => {
    void cargar(1, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onEliminar(id: string) {
    if (!window.confirm('¿Eliminar esta persona y sus imágenes?')) return;
    try {
      await eliminarPersona(id);
      await cargar(page, search);
    } catch {
      setError('No se pudo eliminar');
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Personas</h1>
      <div className="mb-4 flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2"
          placeholder="Buscar por nombre o documento"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="rounded bg-blue-600 px-4 py-2 text-white"
          onClick={() => { setPage(1); void cargar(1, search); }}
        >
          Buscar
        </button>
      </div>
      {error && <p className="mb-2 text-red-600">{error}</p>}
      <table className="w-full rounded bg-white text-sm shadow">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Nombres</th>
            <th className="p-2">Documento</th>
            <th className="p-2">Nacimiento</th>
            <th className="p-2">Edad</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {personas.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="p-2">{p.nombres} {p.apellidos}</td>
              <td className="p-2">{p.nro_documento}</td>
              <td className="p-2">{p.fecha_nacimiento}</td>
              <td className="p-2">{p.edad ?? '—'}</td>
              <td className="p-2">
                <button className="text-red-600 hover:underline" onClick={() => void onEliminar(p.id)}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex items-center gap-2">
        <button
          className="rounded border px-3 py-1 disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => { const n = page - 1; setPage(n); void cargar(n, search); }}
        >
          Anterior
        </button>
        <span>Página {page} de {totalPages}</span>
        <button
          className="rounded border px-3 py-1 disabled:opacity-50"
          disabled={page >= totalPages}
          onClick={() => { const n = page + 1; setPage(n); void cargar(n, search); }}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
