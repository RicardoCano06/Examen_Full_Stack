import { useEffect, useState } from 'react';
import { listarAuditoria, type RegistroAuditoria } from '../api/client';
import Button from '../components/Button';
import Table from '../components/Table';
import { TableSkeleton } from '../components/Spinner';
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
  const [loading, setLoading] = useState(true);

  async function cargar(p = page) {
    setLoading(true);
    try {
      const res = await listarAuditoria(p, 10);
      setFilas(res.data);
      setTotalPages(res.totalPages || 1);
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
      <h1 className="mb-4 text-2xl font-bold">Auditoría de búsquedas</h1>
      {loading ? (
        <div className="w-full bg-white p-4 shadow-sm ring-1 ring-gray-900/5 rounded-xl"><TableSkeleton rows={6} cols={6} /></div>
      ) : (
        <Table headers={['Fecha', 'Término', 'Resultados', 'IP', 'Geo', 'Telegram']}>
          {filas.map((a) => (
            <tr key={a.id} className="border-b last:border-0">
              <td className="p-3">{new Date(a.fecha_hora).toLocaleString()}</td>
              <td className="p-3">{a.termino_buscado}</td>
              <td className="p-3">{a.cantidad_resultados}</td>
              <td className="p-3">{a.ip_origen}</td>
              <td className="p-3">{geoResumen(a.info_geolocalizacion)}</td>
              <td className="p-3">{a.notificacion_telegram_exitosa ? 'OK' : 'Fallo'}</td>
            </tr>
          ))}
        </Table>
      )}
      <div className="mt-4 flex items-center gap-2">
        <Button
          variant="secondary"
          disabled={page <= 1}
          onClick={() => { const n = page - 1; setPage(n); void cargar(n); }}
        >
          Anterior
        </Button>
        <span className="text-sm">Página {page} de {totalPages}</span>
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
