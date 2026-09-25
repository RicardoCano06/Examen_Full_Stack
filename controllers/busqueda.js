const pool = require('../db');
const dns = require('dns').promises;
const http = require('http');
const https = require('https');

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
function esLoopback(ip) {
  return ip === '127.0.0.1' || ip === '::1';
}

// IP blindada con patrón trusted-proxy:
// 1. CF-Connecting-IP (inyectada por Cloudflare, no falsificable por el cliente).
// 2. Si el TCP viene del agente del túnel en localhost (ngrok/cloudflared en la
//    misma máquina), X-Forwarded-For lo escribió el borde del túnel: se toma la
//    ÚLTIMA entrada (la agregada por el edge). La primera se ignora porque el
//    cliente puede falsificarla.
// 3. Conexión directa: XFF se ignora por completo (cualquiera puede forjarla).
// 4. Fallback local para desarrollo.
function getClientIp(req) {
  const cf = req.headers && req.headers['cf-connecting-ip'];
  if (typeof cf === 'string' && cf.trim() !== '') return sanitizarIp(normalizeIp(cf.trim()));
  if (Array.isArray(cf) && cf.length && String(cf[0]).trim() !== '') {
    return sanitizarIp(normalizeIp(String(cf[0]).trim()));
  }
  const sockRaw = req.socket && req.socket.remoteAddress;
  const sock = typeof sockRaw === 'string' && sockRaw.trim() !== '' ? normalizeIp(sockRaw.trim()) : '';
  const xff = req.headers && req.headers['x-forwarded-for'];
  if (xff && sock && esLoopback(sock)) {
    const partes = String(xff).split(',').map((s) => s.trim()).filter(Boolean);
    const ultima = partes[partes.length - 1];
    if (ultima) return sanitizarIp(normalizeIp(ultima));
  }
  if (sock) return sanitizarIp(sock);
  return 'desconocida';
}

function normalizeIp(ip) {
  if (ip.startsWith('::ffff:')) return ip.slice(7);
  return ip;
}

// La IP que se persiste debe tener formato válido (IPv4/IPv6). Cualquier otro
// valor se registra como 'desconocida' en lugar de ensuciar la auditoría.
function esIpValida(ip) {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip) || /^[0-9a-fA-F:]+$/.test(ip);
}

function sanitizarIp(ip) {
  const v = String(ip || '').trim().slice(0, 45);
  return esIpValida(v) ? v : 'desconocida';
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
  // IPv4 explícito: en redes con IPv6 roto, el fetch nativo (dual-stack)
  // se cuelga intentando la ruta IPv6. Se resuelve solo A y se conecta a
  // la IP con SNI + Host del hostname original (el certificado valida igual).
  const u = new URL(url);
  const lib = u.protocol === 'https:' ? https : http;
  const port = u.port ? Number(u.port) : u.protocol === 'https:' ? 443 : 80;
  const headers = { ...(options.headers || {}), Host: u.hostname };
  const body = options.body != null ? String(options.body) : null;
  if (body != null && headers['Content-Length'] == null && headers['content-length'] == null) {
    headers['Content-Length'] = Buffer.byteLength(body);
  }
  return new Promise((resolve, reject) => {
    let done = false;
    const ok = (v) => { if (!done) { done = true; clearTimeout(timer); resolve(v); } };
    const fail = (e) => { if (!done) { done = true; clearTimeout(timer); reject(e); } };
    const timer = setTimeout(() => {
      try { req.destroy(); } catch { /* ya cerrado */ }
      fail(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }));
    }, ms);
    let req;
    (async () => {
      try {
        const { address } = await dns.lookup(u.hostname, { family: 4 });
        req = lib.request(
          {
            host: address,
            port,
            path: u.pathname + u.search,
            method: options.method || 'GET',
            servername: u.hostname,
            headers,
          },
          (res) => {
            let data = '';
            res.on('data', (c) => { data += c; });
            res.on('end', () => ok({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              json: async () => JSON.parse(data),
              text: async () => data,
            }));
          }
        );
        req.on('error', fail);
        if (body != null) req.write(body);
        req.end();
      } catch (e) {
        fail(e);
      }
    })();
  });
}

// Validación síncrona (antes de buscar): si falla -> 403.
async function verifyTurnstile(token, remoteip) {
  const secret = process.env.CAPTCHA_SECRET || process.env.TURNSTILE_SECRET_KEY;
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
        `http://ip-api.com/json/${encodeURIComponent(ip_origen)}?fields=status,message,country,city,isp,org,lat,lon,query`,
        {},
        GEO_TIMEOUT_MS
      );
      if (!geoRes.ok) {
        // 429 (límite gratuito superado) u otro HTTP: se registra el motivo y se sigue.
        geo = { status: 'fail', message: `geolocalización HTTP ${geoRes.status}` };
      } else {
        const data = await geoRes.json().catch(() => null);
        // IPs privadas/locales o cuota excedida devuelven status != success: no son útiles,
        // pero el motivo queda almacenado en el registro crudo.
        geo = data && data.status === 'success'
          ? data
          : { status: 'fail', message: (data && data.message) || 'sin datos útiles para esta IP' };
      }
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
    // Token recortado y acotado: los tokens de Turnstile rondan 1-2KB.
    const captchaToken = String(body.captcha_token ?? body.captchaToken ?? '').trim().slice(0, 2048);
    const termino = validarTermino(String(terminoRaw));

    // SIEMPRE por el extractor blindado (CF-Connecting-IP, nunca X-Forwarded-For).
    const ip = sanitizarIp(getClientIp(req));

    let captchaOk = false;
    try {
      captchaOk = await verifyTurnstile(captchaToken, ip);
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
