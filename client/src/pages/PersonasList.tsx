import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { eliminarPersona, listarPersonas, type Persona } from '../api/client';
import Button from '../components/Button';
import Input from '../components/Input';
import Table from '../components/Table';
import { TableSkeleton } from '../components/Spinner';
import { useToast } from '../components/Toast';

// Solo fecha (es-PY), sin hora: se parsea el YYYY-MM-DD como fecha local
// para evitar que el UTC del ISO reste un día en America/Asuncion.
function soloFecha(iso: string): string {
  const base = iso.slice(0, 10);
  const [y, m, d] = base.split('-').map(Number);
  if (!y || !m || !d) return base;
  return new Date(y, m - 1, d).toLocaleDateString('es-PY');
}

export default function PersonasList() {
  const toast = useToast();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  async function cargar(p = page, q = search) {
    setLoading(true);
    try {
      const res = await listarPersonas(p, 10, q);
      setPersonas(res.data);
      setTotalPages(res.totalPages || 1);
    } catch {
      toast('error', 'No se pudo cargar el listado');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void cargar(1, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onEliminar(id: string) {
    if (!window.confirm('¿Eliminar esta persona y sus imágenes?')) return;
    try {
      await eliminarPersona(id);
      toast('success', 'Persona eliminada');
      await cargar(page, search);
    } catch {
      toast('error', 'No se pudo eliminar');
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Personas</h1>
      <div className="mb-4 flex gap-2">
        <div className="flex-1">
          <Input placeholder="Buscar por nombre o documento" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => { setPage(1); void cargar(1, search); }}>Buscar</Button>
      </div>
      {loading ? (
        <div className="w-full bg-white p-4 shadow-sm ring-1 ring-gray-900/5 rounded-xl"><TableSkeleton rows={6} cols={5} /></div>
      ) : (
        <Table headers={['Nombres', 'Documento', 'Nacimiento', 'Edad', 'Acciones']}>
          {personas.map((p) => (
            <tr key={p.id} className="border-b last:border-0">
              <td className="p-3">{p.nombres} {p.apellidos}</td>
              <td className="p-3">{p.nro_documento}</td>
              <td className="p-3">{soloFecha(p.fecha_nacimiento)}</td>
              <td className="p-3">{p.edad ?? '—'}</td>
              <td className="p-3">
                <span className="flex gap-2 text-sm">
                  <Link className="text-blue-600 hover:underline" to={`/personas/${p.id}`}>Ver</Link>
                  <Link className="text-blue-600 hover:underline" to={`/editar/${p.id}`}>Editar</Link>
                  <button className="text-red-600 hover:underline" onClick={() => void onEliminar(p.id)}>
                    Eliminar
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </Table>
      )}
      <div className="mt-4 flex items-center gap-2">
        <Button
          variant="secondary"
          disabled={page <= 1}
          onClick={() => { const n = page - 1; setPage(n); void cargar(n, search); }}
        >
          Anterior
        </Button>
        <span className="text-sm">Página {page} de {totalPages}</span>
        <Button
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => { const n = page + 1; setPage(n); void cargar(n, search); }}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
