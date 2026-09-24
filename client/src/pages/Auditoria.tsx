import { useEffect, useState } from 'react';
import { listarAuditoria, type RegistroAuditoria } from '../api/client';

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
  const [filas, setFilas] = useState<RegistroAuditoria[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');

  async function cargar(p = page) {
    try {
      setError('');
      const res = await listarAuditoria(p, 10);
      setFilas(res.data);
      setTotalPages(res.totalPages || 1);
    } catch {
      setError('No se pudo cargar la auditoría');
    }
  }

  useEffect(() => {
    void cargar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Auditoría de búsquedas</h1>
      {error && <p className="mb-2 text-red-600">{error}</p>}
      <table className="w-full rounded bg-white text-sm shadow">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Fecha</th>
            <th className="p-2">Término</th>
            <th className="p-2">Resultados</th>
            <th className="p-2">IP</th>
            <th className="p-2">Geo</th>
            <th className="p-2">Telegram</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((a) => (
            <tr key={a.id} className="border-b">
              <td className="p-2">{new Date(a.fecha_hora).toLocaleString()}</td>
              <td className="p-2">{a.termino_buscado}</td>
              <td className="p-2">{a.cantidad_resultados}</td>
              <td className="p-2">{a.ip_origen}</td>
              <td className="p-2">{geoResumen(a.info_geolocalizacion)}</td>
              <td className="p-2">{a.notificacion_telegram_exitosa ? 'OK' : 'Fallo'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex items-center gap-2">
        <button
          className="rounded border px-3 py-1 disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => { const n = page - 1; setPage(n); void cargar(n); }}
        >
          Anterior
        </button>
        <span>Página {page} de {totalPages}</span>
        <button
          className="rounded border px-3 py-1 disabled:opacity-50"
          disabled={page >= totalPages}
          onClick={() => { const n = page + 1; setPage(n); void cargar(n); }}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
