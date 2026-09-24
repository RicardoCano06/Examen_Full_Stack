import { useEffect, useState } from 'react';
import { listarAuditoria, type RegistroAuditoria } from '../api/client';
import Badge from '../components/Badge';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import Table from '../components/Table';
import { TableCardSkeleton } from '../components/Spinner';
import { useToast } from '../components/Toast';

function geoResumen(info: unknown): string {
  if (!info) return '—';
  try {
    const o = typeof info === 'string' ? JSON.parse(info) : info;
    if (o && typeof o === 'object') {
      const r = o as { country?: string; city?: string };
      return [r.country, r.city].filter(Boolean).join(' / ') || '—';
    }
  } catch {
    // respuesta cruda no parseable
  }
  return '—';
}

export default function Auditoria() {
  const toast = useToast();
  const [filas, setFilas] = useState<RegistroAuditoria[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function cargar(p = page) {
    setLoading(true);
    try {
      const res = await listarAuditoria(p, 10);
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
    void cargar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageHeader
        title="Auditoría de búsquedas"
        description={total > 0 ? `${total} eventos registrados · retención de 30 días` : 'Trazabilidad de consultas por IP y notificación'}
      />
      {loading ? (
        <TableCardSkeleton headers={['Fecha', 'Término', 'Resultados', 'IP origen', 'Geolocalización', 'Telegram']} rows={10} />
      ) : filas.length === 0 ? (
        <EmptyState message="Aún no hay búsquedas registradas." />
      ) : (
        <Table headers={['Fecha', 'Término', 'Resultados', 'IP origen', 'Geolocalización', 'Telegram']}>
          {filas.map((a) => (
            <tr key={a.id} className="transition-colors hover:bg-slate-50/70">
              <td className="whitespace-nowrap px-4 py-2 text-slate-600">{new Date(a.fecha_hora).toLocaleString('es-PY')}</td>
              <td className="px-4 py-2 font-mono text-[13px] text-slate-900">{a.termino_buscado}</td>
              <td className="px-4 py-2"><Badge tone="blue">{a.cantidad_resultados}</Badge></td>
              <td className="px-4 py-2 font-mono text-[13px] text-slate-600">{a.ip_origen}</td>
              <td className="px-4 py-2 text-slate-600">{geoResumen(a.info_geolocalizacion)}</td>
              <td className="px-4 py-2">
                <Badge tone={a.notificacion_telegram_exitosa ? 'green' : 'red'}>
                  {a.notificacion_telegram_exitosa ? 'Enviado' : 'Fallido'}
                </Badge>
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
    </div>
  );
}
