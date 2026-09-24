import { useEffect, useState } from 'react';
import { listarAuditoria, type RegistroAuditoria } from '../api/client';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import FechaInput from '../components/FechaInput';
import Input from '../components/Input';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
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

const HEADERS = ['Fecha', 'Término', 'Resultados', 'IP origen', 'Geolocalización', 'Telegram', { label: 'Detalle', center: true }];

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

  async function cargar(p = page, filtros = { q, desde, hasta }) {
    setLoading(true);
    try {
      const res = await listarAuditoria(p, 10, filtros);
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
      <PageHeader
        title="Auditoría de búsquedas"
        breadcrumb={['Inicio', 'Auditoría']}
        description={total > 0 ? `${total} eventos registrados · retención de 30 días` : 'Trazabilidad de consultas por IP y notificación'}
      />
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 basis-64">
            <Input label="Término o IP" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="w-40">
            <FechaInput label="Desde" value={desde} onChange={setDesde} />
          </div>
          <div className="w-40">
            <FechaInput label="Hasta" value={hasta} onChange={setHasta} />
          </div>
          <div className="flex gap-2">
            <Button onClick={onFiltrar}>Filtrar</Button>
            <Button variant="secondary" onClick={onLimpiar}>Limpiar</Button>
          </div>
        </div>
      </Card>
      {loading ? (
        <TableCardSkeleton headers={HEADERS} rows={10} />
      ) : filas.length === 0 ? (
        <EmptyState message="Sin eventos para los filtros indicados." />
      ) : (
        <Table headers={HEADERS}>
          {filas.map((a) => (
            <tr key={a.id} className="transition-colors hover:bg-slate-50/70">
              <td className="whitespace-nowrap px-4 py-2 text-slate-600">{new Date(a.fecha_hora).toLocaleString('es-PY')}</td>
              <td className="px-4 py-2 font-mono text-[13px] font-semibold text-slate-900">{a.termino_buscado}</td>
              <td className="px-4 py-2"><Badge tone="blue">{a.cantidad_resultados}</Badge></td>
              <td className="px-4 py-2 font-mono text-[13px] text-slate-600">{a.ip_origen}</td>
              <td className="px-4 py-2 text-slate-600">{geoResumen(a.info_geolocalizacion)}</td>
              <td className="px-4 py-2">
                <Badge tone={a.notificacion_telegram_exitosa ? 'green' : 'red'}>
                  {a.notificacion_telegram_exitosa ? 'Enviado' : 'Fallido'}
                </Badge>
              </td>
              <td className="px-4 py-2 text-center">
                <button className="text-sm font-medium text-slate-600 hover:text-slate-900" onClick={() => setDetalle(a)}>
                  Ver
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}
      <div className="mt-4 flex items-center gap-3">
        <Button
          variant="secondary"
          disabled={page <= 1}
          onClick={() => { const n = page - 1; setPage(n); void cargar(n); }}
        >
          Anterior
        </Button>
        <span className="text-sm text-slate-500">Página {page} de {totalPages}</span>
        <Button
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => { const n = page + 1; setPage(n); void cargar(n); }}
        >
          Siguiente
        </Button>
      </div>
      {detalle && (
        <Modal title="Detalle técnico de la consulta" onClose={() => setDetalle(null)} wide>
          <dl className="mb-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fecha</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{new Date(detalle.fecha_hora).toLocaleString('es-PY')}</dd>
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
          <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-xs text-slate-100">
            {JSON.stringify(parseGeo(detalle.info_geolocalizacion), null, 2) || 'sin datos'}
          </pre>
        </Modal>
      )}
    </div>
  );
}
