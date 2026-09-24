import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { eliminarPersona, listarPersonas, type Persona } from '../api/client';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import Card from '../components/Card';
import DetalleContenido from '../components/DetalleContenido';
import EditarForm from '../components/EditarForm';
import EmptyState from '../components/EmptyState';
import Input from '../components/Input';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import Table from '../components/Table';
import { TableCardSkeleton } from '../components/Spinner';
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
  const [verId, setVerId] = useState<string | null>(null);
  const [editarId, setEditarId] = useState<string | null>(null);
  const seq = useRef(0);
  const ultimoBuscado = useRef<string | null>(null);

  async function cargar(p = page, q = search) {
    const mi = ++seq.current;
    setLoading(true);
    try {
      const res = await listarPersonas(p, 10, q);
      if (seq.current !== mi) return; // respuesta vieja: se descarta
      setPersonas(res.data);
      setTotalPages(res.totalPages || 1);
      setTotal(res.total || 0);
    } catch {
      if (seq.current !== mi) return;
      toast('error', 'No se pudo cargar el listado');
    } finally {
      if (seq.current === mi) setLoading(false);
    }
  }

  useEffect(() => {
    // Sin cambio real de término (p. ej. remontaje de StrictMode en dev): no refiltrar.
    if (ultimoBuscado.current === search) return;
    if (search === '' && ultimoBuscado.current === null) {
      ultimoBuscado.current = '';
      void cargar(1, '');
      return;
    }
    // Búsqueda en vivo: al escribir se filtra solo tras 400 ms de pausa.
    const t = window.setTimeout(() => {
      ultimoBuscado.current = search;
      setPage(1);
      void cargar(1, search);
    }, 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

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
          <Button variant="secondary" onClick={() => { ultimoBuscado.current = search; setPage(1); void cargar(1, search); }}>Buscar</Button>
        </div>
      </Card>
      {loading ? (
        <TableCardSkeleton headers={['Persona', 'Documento', 'Nacimiento', 'Edad', 'Acciones']} rows={10} avatar />
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
              <td className="px-4 py-2">
                <span className="flex items-center gap-3">
                  <Avatar nombres={p.nombres} apellidos={p.apellidos} />
                  <span className="font-medium text-slate-900"><button className="hover:text-slate-700 hover:underline" onClick={() => setVerId(p.id)}>{p.nombres} {p.apellidos}</button></span>
                </span>
              </td>
              <td className="px-4 py-2 font-mono text-[13px] text-slate-600">{p.nro_documento}</td>
              <td className="px-4 py-2 text-slate-600">{soloFecha(p.fecha_nacimiento)}</td>
              <td className="px-4 py-2 text-slate-600">{p.edad ?? '—'}</td>
              <td className="px-4 py-2">
                <span className="flex gap-3 text-sm">
                  <button className="font-medium text-slate-600 hover:text-slate-900" onClick={() => setVerId(p.id)}>
                    Ver
                  </button>
                  <button className="font-medium text-slate-600 hover:text-slate-900" onClick={() => setEditarId(p.id)}>
                    Editar
                  </button>
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
      {verId && (
        <Modal title="Detalle de persona" onClose={() => setVerId(null)} wide>
          <DetalleContenido id={verId} />
        </Modal>
      )}
      {editarId && (
        <Modal title="Editar persona" onClose={() => setEditarId(null)} wide>
          <EditarForm
            id={editarId}
            onSaved={() => {
              setEditarId(null);
              void cargar(page, search);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
