const pool = require('../db');

const TURNSTILE_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const GEO_TIMEOUT_MS = 3000;
const TELEGRAM_TIMEOUT_MS = 3000;
const SEARCH_LIMIT = 20;

// Acepta letras (incluye tildes/ñ), números y espacios. Todo lo demás -> 400.
const TERMINO_VALIDO = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s]+$/;

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// IP blindada: SOLO CF-Connecting-IP (inyectada por Cloudflare Tunnel).
// Ignora por completo x-forwarded-for (falsificable por el cliente).
// Fallback a req.socket.remoteAddress solo para pruebas locales.
function getClientIp(req) {
  const cf = req.headers && req.headers['cf-connecting-ip'];
  if (typeof cf === 'string' && cf.trim() !== '') return normalizeIp(cf.trim());
  if (Array.isArray(cf) && cf.length && String(cf[0]).trim() !== '') {
    return normalizeIp(String(cf[0]).trim());
  }
  const sock = req.socket && req.socket.remoteAddress;
  if (typeof sock === 'string' && sock.trim() !== '') return normalizeIp(sock.trim());
  return 'desconocida';
}

function normalizeIp(ip) {
  if (ip.startsWith('::ffff:')) return ip.slice(7);
  return ip;
}

function validarTermino(termino) {
  if (!termino || termino.trim().length < 3) {
    throw httpError(400, 'Término de búsqueda inválido (mínimo 3 caracteres)');
  }
  const t = termino.trim();
  if (t.length > 100) throw httpError(400, 'Término de búsqueda inválido');
  if (!TERMINO_VALIDO.test(t)) {
    throw httpError(400, 'Término de búsqueda contiene caracteres no permitidos');
  }
  return t;
}

async function fetchWithTimeout(url, options = {}, ms = 3000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Validación síncrona (antes de buscar): si falla -> 403.
async function verifyTurnstile(token, remoteip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (remoteip && remoteip !== 'desconocida') body.append('remoteip', remoteip);
  const res = await fetchWithTimeout(
    TURNSTILE_URL,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    },
    5000
  );
  const data = await res.json().catch(() => null);
  return !!(data && data.success === true);
}

// Mensaje a Telegram: OMITE el término buscado por privacidad (puede ser
// un DNI o nombre real). Solo fecha, IP, país, ciudad y cantidad.
function buildTelegramMessage({ fecha, ip, pais, ciudad, cantidad }) {
  return (
    `Nueva busqueda\n` +
    `Fecha: ${fecha}\n` +
    `IP: ${ip}\n` +
    `Pais: ${pais || 'desconocido'}\n` +
    `Ciudad: ${ciudad || 'desconocida'}\n` +
    `Resultados: ${cantidad}`
  );
}

// Auditoría en segundo plano. Nunca toca res (la respuesta ya se envió).
async function auditoriaEnSegundoPlano({ termino_buscado, cantidad_resultados, ip_origen }) {
  try {
    let geo = null;
    try {
      const geoRes = await fetchWithTimeout(
        `http://ip-api.com/json/${encodeURIComponent(ip_origen)}?fields=status,message,country,city,query`,
        {},
        GEO_TIMEOUT_MS
      );
      geo = await geoRes.json().catch(() => null);
    } catch {
      geo = null;
    }

    const pais = geo && geo.country;
    const ciudad = geo && geo.city;
    const fecha = new Date().toLocaleString('es-PY', { timeZone: 'America/Asuncion' });

    let telegramOk = false;
    try {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (token && chatId) {
        const tgRes = await fetchWithTimeout(
          `https://api.telegram.org/bot${token}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: buildTelegramMessage({ fecha, ip: ip_origen, pais, ciudad, cantidad: cantidad_resultados }),
            }),
          },
          TELEGRAM_TIMEOUT_MS
        );
        const tgData = await tgRes.json().catch(() => null);
        telegramOk = !!(tgData && tgData.ok === true);
      }
    } catch {
      telegramOk = false;
    }

    await pool.query(
      `INSERT INTO auditoria_busquedas (termino_buscado, cantidad_resultados, ip_origen, info_geolocalizacion, notificacion_telegram_exitosa)
       VALUES ($1, $2, $3, $4, $5)`,
      [termino_buscado, cantidad_resultados, ip_origen, geo ? JSON.stringify(geo) : null, telegramOk]
    );
  } catch (err) {
    console.error('Error en auditoria en segundo plano:', err.message);
  }
}

// POST /api/personas/buscar — responde rápido y audita después (fire and forget).
async function buscar(req, res, next) {
  try {
    const body = req.body || {};
    const terminoRaw = body.termino ?? body.termino_buscado ?? body.q ?? '';
    const captchaToken = body.captcha_token ?? body.captchaToken ?? '';
    const termino = validarTermino(String(terminoRaw));

    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;

    let captchaOk = false;
    try {
      captchaOk = await verifyTurnstile(String(captchaToken), ip);
    } catch {
      captchaOk = false;
    }
    if (!captchaOk) throw httpError(403, 'Verificación de captcha fallida');

    const like = `%${termino}%`;
    const result = await pool.query(
      `SELECT id, nombres, apellidos, nro_documento, fecha_nacimiento,
              ruta_foto_frente, ruta_foto_dorso,
              DATE_PART('year', AGE(fecha_nacimiento))::int AS edad
       FROM personas
       WHERE nombres ILIKE $1 OR apellidos ILIKE $1 OR nro_documento ILIKE $1
       ORDER BY apellidos, nombres
       LIMIT ${SEARCH_LIMIT}`,
      [like]
    );
    const filas = result.rows;

    // Respuesta inmediata: no se bloquea esperando a ip-api ni a Telegram.
    res.status(200).json({ resultados: filas, cantidad_resultados: filas.length });

    // Fire and forget JUSTO DESPUÉS de responder.
    void auditoriaEnSegundoPlano({
      termino_buscado: termino,
      cantidad_resultados: filas.length,
      ip_origen: ip,
    });
    return;
  } catch (err) {
    return next(err);
  }
}

module.exports = { buscar, getClientIp, validarTermino, auditoriaEnSegundoPlano, buildTelegramMessage };
