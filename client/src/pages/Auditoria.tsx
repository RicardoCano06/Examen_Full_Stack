import { useEffect, useState } from 'react';
import { listarAuditoria, type RegistroAuditoria } from '../api/client';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import FechaInput from '../components/FechaInput';
import Input from '../components/Input';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import StatusDot from '../components/StatusDot';
import Table from '../components/Table';
import { TableCardSkeleton } from '../components/Spinner';
import { useToast } from '../components/Toast';

interface Geo {
  country?: string;
  city?: string;
  isp?: string;
  org?: string;
  lat?: number;
  lon?: number;
  status?: string;
  message?: string;
  query?: string;
}

function parseGeo(info: unknown): Geo | null {
  if (!info) return null;
  try {
    const o = typeof info === 'string' ? JSON.parse(info) : info;
    return o && typeof o === 'object' ? (o as Geo) : null;
  } catch {
    return null;
  }
}

function geoResumen(info: unknown): string {
  const g = parseGeo(info);
  if (!g) return '—';
  return [g.country, g.city].filter(Boolean).join(' / ') || '—';
}

const FMT_HORA = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false } as const;

function proveedorDe(info: unknown): string {
  const g = parseGeo(info);
  return (g && (g.isp || g.org)) || '—';
}

const HEADERS = ['Fecha y hora', { label: 'Término buscado', center: true }, { label: 'Cant. resultados', center: true }, { label: 'IP origen', center: true }, { label: 'Proveedor', center: true }, { label: 'Ubicación', center: true }, { label: 'Telegram', center: true }];

export default function Auditoria() {
  const toast = useToast();
  const [filas, setFilas] = useState<RegistroAuditoria[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [detalle, setDetalle] = useState<RegistroAuditoria | null>(null);
  const PAGE_SIZE = 15;

  async function cargar(p = page, filtros = { q, desde, hasta }) {
    setLoading(true);
    try {
      const res = await listarAuditoria(p, PAGE_SIZE, filtros);
      setFilas(res.data);
      setTotalPages(res.totalPages || 1);
      setTotal(res.total || 0);
    } catch {
      toast('error', 'No se pudo cargar la auditoría');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void cargar(1, { q: '', desde: '', hasta: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onFiltrar() {
    setPage(1);
    void cargar(1, { q, desde, hasta });
  }

  function onLimpiar() {
    setQ('');
    setDesde('');
    setHasta('');
    setPage(1);
    void cargar(1, { q: '', desde: '', hasta: '' });
  }

  const geoSel = detalle ? parseGeo(detalle.info_geolocalizacion) : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full max-w-md">
          <Input label="Término o IP" value={q} onChange={(e) => setQ(e.target.value)} maxLength={100} />
        </div>
        <div className="w-40">
          <FechaInput label="Desde" value={desde} onChange={setDesde} />
        </div>
        <div className="w-40">
          <FechaInput label="Hasta" value={hasta} onChange={setHasta} />
        </div>
        <div className="flex gap-2 self-end">
          <Button onClick={onFiltrar} className="h-10">Filtrar</Button>
          <Button variant="secondary" onClick={onLimpiar} className="h-10">Limpiar</Button>
          <Button
            variant="secondary"
            onClick={() => void cargar(page, { q, desde, hasta })}
            aria-label="Actualizar"
            title="Actualizar"
            className="h-10"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
          </Button>
        </div>
      </div>
      {loading ? (
        <TableCardSkeleton headers={HEADERS} rows={15} widths={['w-44', 'w-32', 'w-10', 'w-32', 'w-36', 'w-36', 'w-24']} />
      ) : filas.length === 0 ? (
        <EmptyState message="Sin eventos para los filtros indicados." />
      ) : (
        <Table headers={HEADERS}>
          {filas.map((a) => (
            <tr
              key={a.id}
              onClick={() => {
                // No abrir si el usuario solo seleccionaba texto para copiar.
                if (window.getSelection()?.toString()) return;
                setDetalle(a);
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') setDetalle(a); }}
              tabIndex={0}
              className="cursor-pointer transition-colors hover:bg-slate-50 focus:outline-none focus:bg-slate-50"
            >
              <td className="whitespace-nowrap px-4 py-2 text-sm text-slate-600">{new Date(a.fecha_hora).toLocaleString('es-PY', FMT_HORA)}</td>
              <td className="px-4 py-2 text-center text-sm font-semibold text-slate-900" title={a.termino_buscado}><span className="block truncate">{a.termino_buscado}</span></td>
              <td className={`px-4 py-2 text-center text-sm ${a.cantidad_resultados === 0 ? 'text-slate-400' : 'font-medium text-slate-700'}`}>{a.cantidad_resultados}</td>
              <td className="px-4 py-2 text-center text-sm text-slate-600">{a.ip_origen}</td>
              <td className="px-4 py-2 text-center text-sm text-slate-600" title={proveedorDe(a.info_geolocalizacion)}><span className="block truncate">{proveedorDe(a.info_geolocalizacion)}</span></td>
              <td className="px-4 py-2 text-center text-sm text-slate-600" title={geoResumen(a.info_geolocalizacion)}><span className="block truncate">{geoResumen(a.info_geolocalizacion)}</span></td>
              <td className="px-4 py-2 text-center">
                <StatusDot tone={a.notificacion_telegram_exitosa ? 'green' : 'red'}>
                  {a.notificacion_telegram_exitosa ? 'Enviado' : 'Fallido'}
                </StatusDot>
              </td>
            </tr>
          ))}
        </Table>
      )}
      <Pagination
        page={page}
        totalPages={totalPages}
        counter={`Mostrando ${total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} de ${total}`}
        onFirst={() => { setPage(1); void cargar(1); }}
        onPrev={() => { const n = page - 1; setPage(n); void cargar(n); }}
        onNext={() => { const n = page + 1; setPage(n); void cargar(n); }}
        onLast={() => { setPage(totalPages); void cargar(totalPages); }}
      />
      {detalle && (
        <Modal title="Detalle técnico de la consulta" onClose={() => setDetalle(null)} wide>
          <dl className="mb-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fecha</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{new Date(detalle.fecha_hora).toLocaleString('es-PY', FMT_HORA)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Término</dt>
              <dd className="mt-0.5 font-mono text-[13px] font-semibold text-slate-900">{detalle.termino_buscado}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Resultados</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{detalle.cantidad_resultados}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">IP origen</dt>
              <dd className="mt-0.5 font-mono text-[13px] font-semibold text-slate-900">{detalle.ip_origen}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Proveedor / Org.</dt>
              <dd className="mt-0.5 text-slate-900">{geoSel?.isp || geoSel?.org || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Coordenadas</dt>
              <dd className="mt-0.5 font-mono text-[13px] text-slate-900">
                {geoSel?.lat !== undefined && geoSel?.lon !== undefined ? `${geoSel.lat}, ${geoSel.lon}` : '—'}
              </dd>
            </div>
          </dl>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Respuesta cruda de geolocalización</p>
          <pre className="max-h-64 overflow-auto rounded-lg bg-slate-50 p-4 font-mono text-xs text-slate-900 ring-1 ring-slate-900/10">
            {JSON.stringify(parseGeo(detalle.info_geolocalizacion), null, 2) || 'sin datos'}
          </pre>
        </Modal>
      )}
    </div>
  );
}
