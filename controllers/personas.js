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

// GET /api/personas — solo navegación paginada (CRUD).
// El filtrado por término está PROHIBIDO aquí: toda búsqueda debe pasar por
// POST /api/personas/buscar con captcha verificado (requisito anti-bot).
async function list(req, res, next) {
  try {
    if (String(req.query.search || '').trim() !== '') {
      throw httpError(400, 'La búsqueda requiere verificación anti-automatización');
    }
    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '10', 10) || 10));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*)::int AS total FROM personas');
    const total = countResult.rows[0].total;

    const dataResult = await pool.query(
      `SELECT id, nombres, apellidos, nro_documento, fecha_nacimiento,
              ruta_foto_frente, ruta_foto_dorso,
              DATE_PART('year', AGE(fecha_nacimiento))::int AS edad
       FROM personas
       ORDER BY apellidos, nombres
       LIMIT $1 OFFSET $2`,
      [limit, offset]
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

// PUT /api/personas/:id — edición atómica:
// 1) valida texto, 2) valida magic bytes de las fotos nuevas en memoria,
// 3) UPDATE, 4) solo entonces escribe archivos nuevos y borra los reemplazados.
async function update(req, res, next) {
  const reemplazadas = [];
  try {
    const sel = await pool.query(
      `SELECT id, nombres, apellidos, nro_documento, fecha_nacimiento,
              ruta_foto_frente, ruta_foto_dorso
       FROM personas WHERE id = $1`,
      [req.params.id]
    );
    if (sel.rows.length === 0) {
      throw httpError(404, 'Persona no encontrada');
    }
    const actual = sel.rows[0];

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

    // Fotos opcionales e independientes: solo se reemplaza el lado enviado.
    const nuevaFrente = req.files && req.files.foto_frente && req.files.foto_frente[0];
    const nuevoDorso = req.files && req.files.foto_dorso && req.files.foto_dorso[0];

    let rutaFrente = actual.ruta_foto_frente;
    let rutaDorso = actual.ruta_foto_dorso;
    let nombreFrente = null;
    let nombreDorso = null;

    if (nuevaFrente) {
      const tipo = await validateImageBuffer(nuevaFrente.buffer);
      nombreFrente = `${uuidv4()}${tipo.ext}`;
      rutaFrente = `uploads/${nombreFrente}`;
    }
    if (nuevoDorso) {
      const tipo = await validateImageBuffer(nuevoDorso.buffer);
      nombreDorso = `${uuidv4()}${tipo.ext}`;
      rutaDorso = `uploads/${nombreDorso}`;
    }

    let row;
    try {
      const result = await pool.query(
        `UPDATE personas SET nombres = $1, apellidos = $2, nro_documento = $3,
               fecha_nacimiento = $4, ruta_foto_frente = $5, ruta_foto_dorso = $6
         WHERE id = $7
         RETURNING id, nombres, apellidos, nro_documento, fecha_nacimiento, ruta_foto_frente, ruta_foto_dorso`,
        [nombres, apellidos, nro_documento, fecha_nacimiento, rutaFrente, rutaDorso, req.params.id]
      );
      row = result.rows[0];
    } catch (dbErr) {
      if (dbErr && dbErr.code === '23505') {
        throw httpError(409, 'El número de documento ya existe');
      }
      throw dbErr;
    }

    // Solo tras el UPDATE exitoso se escriben los archivos nuevos.
    try {
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
      const escrituras = [];
      if (nombreFrente) escrituras.push(fs.writeFile(path.join(UPLOADS_DIR, nombreFrente), nuevaFrente.buffer));
      if (nombreDorso) escrituras.push(fs.writeFile(path.join(UPLOADS_DIR, nombreDorso), nuevoDorso.buffer));
      await Promise.all(escrituras);
    } catch (fsErr) {
      // Compensación: se revierte el UPDATE a las rutas anteriores.
      try {
        await pool.query(
          'UPDATE personas SET ruta_foto_frente = $1, ruta_foto_dorso = $2 WHERE id = $3',
          [actual.ruta_foto_frente, actual.ruta_foto_dorso, req.params.id]
        );
      } catch {
        // Se ignora: el error original de disco es lo relevante para el log interno.
      }
      if (nombreFrente) reemplazadas.push(nombreFrente);
      if (nombreDorso) reemplazadas.push(nombreDorso);
      throw fsErr;
    }

    // Recién ahora se borran las fotos reemplazadas (best-effort).
    const obsoletas = [];
    if (nombreFrente) obsoletas.push(actual.ruta_foto_frente);
    if (nombreDorso) obsoletas.push(actual.ruta_foto_dorso);
    for (const ruta of obsoletas) {
      const abs = resolveUploadPath(ruta);
      if (!abs) continue;
      try {
        await fs.unlink(abs);
      } catch (e) {
        if (e && e.code !== 'ENOENT') console.error('No se pudo eliminar archivo:', abs, e.message);
      }
    }

    return res.json(row);
  } catch (err) {
    for (const nombre of reemplazadas) {
      try {
        await fs.unlink(path.join(UPLOADS_DIR, nombre));
      } catch {
        // Limpieza parcial best-effort
      }
    }
    return next(err);
  }
}

module.exports = { create, list, getById, update, remove };
