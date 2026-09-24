const pool = require('../db');

// GET /api/auditoria — historial de búsquedas, fecha descendente, paginado.
// Filtros opcionales: q (término o IP, parcial), desde/hasta (YYYY-MM-DD).
// Los valores malformados se ignoran para no romper la consulta.
function esFechaValida(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s + 'T00:00:00Z').getTime());
}

async function list(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '10', 10) || 10));
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];
    const q = String(req.query.q || '').trim().slice(0, 100);
    if (q) {
      params.push(`%${q}%`);
      where.push(`(termino_buscado ILIKE $${params.length} OR ip_origen ILIKE $${params.length})`);
    }
    const desde = String(req.query.desde || '');
    if (esFechaValida(desde)) {
      params.push(desde);
      where.push(`DATE(fecha_hora) >= $${params.length}`);
    }
    const hasta = String(req.query.hasta || '');
    if (esFechaValida(hasta)) {
      params.push(hasta);
      where.push(`DATE(fecha_hora) <= $${params.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM auditoria_busquedas ${whereSql}`,
      params
    );
    const total = countResult.rows[0].total;

    const result = await pool.query(
      `SELECT id, fecha_hora, termino_buscado, cantidad_resultados,
              ip_origen, info_geolocalizacion, notificacion_telegram_exitosa
       FROM auditoria_busquedas ${whereSql}
       ORDER BY fecha_hora DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return res.json({
      data: result.rows,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list };
