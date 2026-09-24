import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { buscarPersonas, eliminarPersona, listarPersonas, type Persona } from '../api/client';
import ActionsMenu from '../components/ActionsMenu';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
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
import { puntosMiles, soloFecha } from '../utils/format';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void }) => string;
      reset?: (id?: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

const SITEKEY = import.meta.env.VITE_TURNSTILE_SITEKEY as string | undefined;

// Búsqueda única del sistema: el filtro por término SIEMPRE exige captcha
// verificado en el servidor (POST /api/personas/buscar). Sin token no hay
// búsqueda, ni desde la UI ni llamando a la API directamente.
export default function PersonasList() {
  const toast = useToast();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [resultados, setResultados] = useState<Persona[]>([]);
  const [modo, setModo] = useState<'browse' | 'search'>('browse');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [verId, setVerId] = useState<string | null>(null);
  const [editarId, setEditarId] = useState<string | null>(null);
  const seq = useRef(0);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string>('');
  const PAGE_SIZE = 10;

  async function cargar(p = page) {
    const mi = ++seq.current;
    setLoading(true);
    try {
      const res = await listarPersonas(p, PAGE_SIZE);
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
    void cargar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Widget Turnstile explícito: un token por búsqueda, nunca por tecla.
  useEffect(() => {
    if (!SITEKEY) return;
    const renderWidget = () => {
      if (widgetRef.current && window.turnstile && !widgetId.current) {
        widgetId.current = window.turnstile.render(widgetRef.current, {
          sitekey: SITEKEY,
          callback: (t: string) => setToken(t),
        });
      }
    };
    if (window.turnstile) {
      renderWidget();
      return;
    }
    window.onTurnstileLoad = renderWidget;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      window.onTurnstileLoad = undefined;
    };
  }, []);

  function resetCaptcha() {
    setToken('');
    window.turnstile?.reset?.(widgetId.current || undefined);
    widgetId.current = '';
  }

  async function onBuscar() {
    if (search.trim().length < 3) {
      toast('error', 'Ingrese al menos 3 caracteres');
      return;
    }
    if (!token) {
      toast('error', 'Complete el captcha antes de buscar');
      return;
    }
    setLoading(true);
    try {
      const res = await buscarPersonas(search.trim(), token);
      setResultados(res.resultados || []);
      setModo('search');
      resetCaptcha();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const r = (err as { response?: { status?: number; data?: { error?: string } } }).response;
        toast('error', r?.data?.error || `Error ${r?.status || ''} en la búsqueda`);
      } else {
        toast('error', 'Error de red en la búsqueda');
      }
    } finally {
      setLoading(false);
    }
  }

  function onLimpiar() {
    setSearch('');
    setModo('browse');
    setPage(1);
    void cargar(1);
  }

  async function volverABrowse() {
    setModo('browse');
    setSearch('');
    setPage(1);
    await cargar(1);
  }

  async function onEliminar(id: string) {
    if (!window.confirm('¿Eliminar esta persona y sus imágenes?')) return;
    try {
      await eliminarPersona(id);
      toast('success', 'Persona eliminada');
      await volverABrowse();
    } catch {
      toast('error', 'No se pudo eliminar');
    }
  }

  const filas = modo === 'search' ? resultados : personas;
  const HEADERS = ['Persona', 'Documento', 'Nacimiento', 'Edad', 'Fotos', { label: 'Acciones', center: true }];

  return (
    <div>
      <PageHeader
        title="Personas"
        breadcrumb={['Inicio', 'Personas']}
        description="Registro de personas con documento de identidad"
        actions={
          <Link to="/registrar">
            <Button>Nueva persona</Button>
          </Link>
        }
      />
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 basis-64">
            <Input
              placeholder="Nombre, apellido o documento (mín. 3 caracteres)"
              value={search}
              onChange={(e) => {
                const v = e.target.value;
                setSearch(v);
                // Al vaciar el campo se vuelve al listado completo.
                if (v.trim() === '' && modo === 'search') {
                  setModo('browse');
                  setPage(1);
                  void cargar(1);
                }
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') void onBuscar(); }}
            />
          </div>
          {!SITEKEY && <p className="text-sm text-amber-600">Falta VITE_TURNSTILE_SITEKEY en el .env del frontend.</p>}
          <div ref={widgetRef} />
          <Button onClick={() => void onBuscar()} disabled={!token} loading={loading && modo === 'search'}>
            Buscar
          </Button>
          {modo === 'search' && (
            <Button variant="secondary" onClick={onLimpiar}>
              Limpiar
            </Button>
          )}
        </div>
      </Card>
      {loading ? (
        <TableCardSkeleton headers={HEADERS} rows={10} avatar />
      ) : filas.length === 0 ? (
        <EmptyState
          message={modo === 'search' ? 'Sin resultados para ese término.' : 'Aún no hay personas registradas.'}
          action={
            modo === 'search' ? (
              <Button variant="secondary" onClick={onLimpiar}>Limpiar búsqueda</Button>
            ) : (
              <Link to="/registrar">
                <Button>Registrar persona</Button>
              </Link>
            )
          }
        />
      ) : (
        <Table headers={HEADERS}>
          {filas.map((p) => (
            <tr key={p.id} className="transition-colors hover:bg-slate-50/70">
              <td className="px-4 py-2">
                <span className="flex items-center gap-3">
                  <Avatar nombres={p.nombres} apellidos={p.apellidos} />
                  <span className="font-semibold text-slate-900"><button className="hover:text-slate-700 hover:underline" onClick={() => setVerId(p.id)}>{p.nombres} {p.apellidos}</button></span>
                </span>
              </td>
              <td className="px-4 py-2 text-sm text-slate-600">{puntosMiles(p.nro_documento)}</td>
              <td className="px-4 py-2 text-slate-600">{soloFecha(p.fecha_nacimiento)}</td>
              <td className="px-4 py-2 text-slate-600">{p.edad ?? '—'}</td>
              <td className="px-4 py-2">
                <Badge tone={p.ruta_foto_frente && p.ruta_foto_dorso ? 'green' : 'slate'}>
                  {p.ruta_foto_frente && p.ruta_foto_dorso ? 'OK' : '—'}
                </Badge>
              </td>
              <td className="px-4 py-2 text-center">
                <ActionsMenu
                  items={[
                    { label: 'Ver', onSelect: () => setVerId(p.id) },
                    { label: 'Editar', onSelect: () => setEditarId(p.id) },
                    { label: 'Eliminar', tone: 'danger', onSelect: () => void onEliminar(p.id) },
                  ]}
                />
              </td>
            </tr>
          ))}
        </Table>
      )}
      {modo === 'browse' ? (
        <div className="mt-4 flex items-center gap-3">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => { const n = page - 1; setPage(n); void cargar(n); }}
          >
            Anterior
          </Button>
          <span className="text-sm text-slate-500">Página {page} de {totalPages}</span>
          <span className="text-sm text-slate-400">
            Mostrando {total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
          </span>
          <Button
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => { const n = page + 1; setPage(n); void cargar(n); }}
          >
            Siguiente
          </Button>
        </div>
      ) : (
        !loading && (
          <p className="mt-4 text-sm text-slate-500">
            {resultados.length} resultado{resultados.length === 1 ? '' : 's'} de búsqueda auditada.
          </p>
        )
      )}
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
              void volverABrowse();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
