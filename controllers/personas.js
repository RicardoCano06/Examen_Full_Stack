const path = require('path');
const fs = require('fs/promises');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const { validateImageBuffer, UPLOADS_DIR } = require('../middlewares/upload');

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') {
      return String(obj[k]).trim();
    }
  }
  return '';
}

function isValidDateOnly(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function isFutureDateOnly(s) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  return s > todayStr;
}

// Resuelve una ruta guardada en BD a absoluta, contenida en UPLOADS_DIR.
// Retorna null si es inválida (no se borra nada en ese caso).
function resolveUploadPath(rutaRelativa) {
  if (!rutaRelativa || typeof rutaRelativa !== 'string') return null;
  const base = path.basename(rutaRelativa);
  // Solo nombres tipo uuid.ext, sin directorios ni traversal
  if (!/^[0-9a-fA-F-]{36}\.(jpg|png|webp)$/.test(base)) return null;
  const abs = path.join(UPLOADS_DIR, base);
  if (!abs.startsWith(UPLOADS_DIR)) return null;
  return abs;
}

// POST /api/personas — operación atómica:
// 1) valida texto, 2) valida magic bytes en memoria, 3) INSERT, 4) solo entonces escribe a disco.
async function create(req, res, next) {
  try {
    const nombres = pick(req.body, 'nombres');
    const apellidos = pick(req.body, 'apellidos');
    const nro_documento = pick(req.body, 'nro_documento', 'documento');
    const fecha_nacimiento = pick(req.body, 'fecha_nacimiento', 'fechaNacimiento');

    if (!nombres || !apellidos || !nro_documento || !fecha_nacimiento) {
      throw httpError(400, 'Faltan datos obligatorios: nombres, apellidos, documento y fecha de nacimiento');
    }
    if (!isValidDateOnly(fecha_nacimiento)) {
      throw httpError(400, 'Fecha de nacimiento inválida (use YYYY-MM-DD)');
    }
    if (isFutureDateOnly(fecha_nacimiento)) {
      throw httpError(400, 'Fecha de nacimiento no puede ser futura');
    }

    const fotoFrente = req.files && req.files.foto_frente && req.files.foto_frente[0];
    const fotoDorso = req.files && req.files.foto_dorso && req.files.foto_dorso[0];
    if (!fotoFrente || !fotoDorso) {
      throw httpError(400, 'Debe enviar foto_frente y foto_dorso');
    }

    // Validación de magic bytes en memoria. Si falla, se retorna 400 y la memoria se descarta.
    const [tipoFrente, tipoDorso] = await Promise.all([
      validateImageBuffer(fotoFrente.buffer),
      validateImageBuffer(fotoDorso.buffer),
    ]);

    const nombreFrente = `${uuidv4()}${tipoFrente.ext}`;
    const nombreDorso = `${uuidv4()}${tipoDorso.ext}`;
    const rutaFrente = `uploads/${nombreFrente}`;
    const rutaDorso = `uploads/${nombreDorso}`;

    let row;
    try {
      const result = await pool.query(
        `INSERT INTO personas (nombres, apellidos, nro_documento, fecha_nacimiento, ruta_foto_frente, ruta_foto_dorso)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, nombres, apellidos, nro_documento, fecha_nacimiento, ruta_foto_frente, ruta_foto_dorso`,
        [nombres, apellidos, nro_documento, fecha_nacimiento, rutaFrente, rutaDorso]
      );
      row = result.rows[0];
    } catch (dbErr) {
      // Documento duplicado: índice único B-Tree sobre nro_documento
      if (dbErr && dbErr.code === '23505') {
        throw httpError(409, 'El número de documento ya existe');
      }
      throw dbErr;
    }

    // Solo si el INSERT fue exitoso se escribe físicamente a disco.
    try {
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
      await Promise.all([
        fs.writeFile(path.join(UPLOADS_DIR, nombreFrente), fotoFrente.buffer),
        fs.writeFile(path.join(UPLOADS_DIR, nombreDorso), fotoDorso.buffer),
      ]);
    } catch (fsErr) {
      // Compensación: si el disco falla, se revierte el INSERT para no dejar registro sin archivos.
      try {
        await pool.query('DELETE FROM personas WHERE id = $1', [row.id]);
      } catch {
        // Se ignora: el error original de disco es lo relevante para el log interno.
      }
      try {
        await fs.unlink(path.join(UPLOADS_DIR, nombreFrente)).catch(() => {});
        await fs.unlink(path.join(UPLOADS_DIR, nombreDorso)).catch(() => {});
      } catch {
        // Limpieza parcial best-effort
      }
      throw fsErr;
    }

    return res.status(201).json(row);
  } catch (err) {
    return next(err);
  }
}

// GET /api/personas — listado paginado con edad calculada al vuelo (no almacenada).
async function list(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '10', 10) || 10));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    const where = [];
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      where.push(`(nombres ILIKE $${params.length} OR apellidos ILIKE $${params.length} OR nro_documento ILIKE $${params.length})`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM personas ${whereSql}`, params);
    const total = countResult.rows[0].total;

    const dataParams = [...params, limit, offset];
    const dataResult = await pool.query(
      `SELECT id, nombres, apellidos, nro_documento, fecha_nacimiento,
              ruta_foto_frente, ruta_foto_dorso,
              DATE_PART('year', AGE(fecha_nacimiento))::int AS edad
       FROM personas ${whereSql}
       ORDER BY apellidos, nombres
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    return res.json({
      data: dataResult.rows,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return next(err);
  }
}

async function getById(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, nombres, apellidos, nro_documento, fecha_nacimiento,
              ruta_foto_frente, ruta_foto_dorso,
              DATE_PART('year', AGE(fecha_nacimiento))::int AS edad
       FROM personas WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      throw httpError(404, 'Persona no encontrada');
    }
    return res.json(result.rows[0]);
  } catch (err) {
    return next(err);
  }
}

// DELETE /api/personas/:id — borra el registro y sus archivos físicos.
async function remove(req, res, next) {
  try {
    const sel = await pool.query(
      'SELECT ruta_foto_frente, ruta_foto_dorso FROM personas WHERE id = $1',
      [req.params.id]
    );
    if (sel.rows.length === 0) {
      throw httpError(404, 'Persona no encontrada');
    }
    const { ruta_foto_frente: rutaFrente, ruta_foto_dorso: rutaDorso } = sel.rows[0];

    await pool.query('DELETE FROM personas WHERE id = $1', [req.params.id]);

    // Eliminación física best-effort: si el archivo no existe, no rompe la respuesta.
    for (const ruta of [rutaFrente, rutaDorso]) {
      const abs = resolveUploadPath(ruta);
      if (!abs) continue;
      try {
        await fs.unlink(abs);
      } catch (e) {
        if (e && e.code !== 'ENOENT') console.error('No se pudo eliminar archivo:', abs, e.message);
      }
    }

    return res.json({ message: 'Persona eliminada' });
  } catch (err) {
    return next(err);
  }
}

module.exports = { create, list, getById, remove };
