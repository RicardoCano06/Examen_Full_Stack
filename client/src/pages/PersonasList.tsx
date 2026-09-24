import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { eliminarPersona, listarPersonas, type Persona } from '../api/client';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Input from '../components/Input';
import PageHeader from '../components/PageHeader';
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
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  async function cargar(p = page, q = search) {
    setLoading(true);
    try {
      const res = await listarPersonas(p, 10, q);
      setPersonas(res.data);
      setTotalPages(res.totalPages || 1);
      setTotal(res.total || 0);
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
      <PageHeader
        title="Personas"
        description={total > 0 ? `${total} registros en el sistema` : 'Registro de personas con documento de identidad'}
        actions={
          <Link to="/registrar">
            <Button>Nueva persona</Button>
          </Link>
        }
      />
      <Card className="mb-4 p-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input placeholder="Buscar por nombre o documento" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="secondary" onClick={() => { setPage(1); void cargar(1, search); }}>Buscar</Button>
        </div>
      </Card>
      {loading ? (
        <Card className="p-4"><TableSkeleton rows={6} cols={5} /></Card>
      ) : personas.length === 0 ? (
        <EmptyState
          message="Sin resultados para los criterios indicados."
          action={
            <Link to="/registrar">
              <Button>Registrar persona</Button>
            </Link>
          }
        />
      ) : (
        <Table headers={['Persona', 'Documento', 'Nacimiento', 'Edad', 'Acciones']}>
          {personas.map((p) => (
            <tr key={p.id} className="transition-colors hover:bg-slate-50/70">
              <td className="px-4 py-3">
                <span className="flex items-center gap-3">
                  <Avatar nombres={p.nombres} apellidos={p.apellidos} />
                  <span className="font-medium text-slate-900">{p.nombres} {p.apellidos}</span>
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-[13px] text-slate-600">{p.nro_documento}</td>
              <td className="px-4 py-3 text-slate-600">{soloFecha(p.fecha_nacimiento)}</td>
              <td className="px-4 py-3 text-slate-600">{p.edad ?? '—'}</td>
              <td className="px-4 py-3">
                <span className="flex gap-3 text-sm">
                  <Link className="font-medium text-blue-600 hover:text-blue-800" to={`/personas/${p.id}`}>Ver</Link>
                  <Link className="font-medium text-blue-600 hover:text-blue-800" to={`/editar/${p.id}`}>Editar</Link>
                  <button className="font-medium text-red-600 hover:text-red-800" onClick={() => void onEliminar(p.id)}>
                    Eliminar
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </Table>
      )}
      <div className="mt-4 flex items-center gap-3">
        <Button
          variant="secondary"
          disabled={page <= 1}
          onClick={() => { const n = page - 1; setPage(n); void cargar(n, search); }}
        >
          Anterior
        </Button>
        <span className="text-sm text-slate-500">Página {page} de {totalPages}</span>
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
