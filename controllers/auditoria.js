const pool = require('../db');

// GET /api/auditoria — historial de búsquedas, fecha descendente, paginado.
async function list(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '10', 10) || 10));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM auditoria_busquedas');
    const total = countResult.rows[0].total;

    const result = await pool.query(
      `SELECT id, fecha_hora, termino_buscado, cantidad_resultados,
              ip_origen, info_geolocalizacion, notificacion_telegram_exitosa
       FROM auditoria_busquedas
       ORDER BY fecha_hora DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
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
