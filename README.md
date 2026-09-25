# Registro de Personas con Auditoría de Búsquedas

Aplicación web para registrar y consultar datos de personas con documentos de identidad, con verificación anti-automatización, trazabilidad de consultas por IP y notificación a Telegram.

## Índice

1. [Arquitectura y stack](#1-arquitectura-y-stack)
2. [Almacenamiento de imágenes](#2-almacenamiento-de-imágenes)
3. [Dirección IP del visitante](#3-dirección-ip-del-visitante)
4. [Captcha](#4-captcha)
5. [Notificación a Telegram](#5-notificación-a-telegram)
6. [Fallos de servicios externos](#6-fallos-de-servicios-externos)
7. [Retención del historial](#7-retención-del-historial)
8. [Alcance y trabajo futuro](#8-alcance-y-trabajo-futuro)
9. [Puesta en marcha](#9-puesta-en-marcha)
10. [Referencia de la API](#10-referencia-de-la-api)
11. [Uso de inteligencia artificial](#11-uso-de-inteligencia-artificial)

## 1. Arquitectura y stack

API REST en Express sin ORM (SQL puro con `pg`) y SPA en React. Se eligió Express por ser suficiente para un CRUD con I/O asíncrono sin sobrecarga; PostgreSQL por el control total del esquema, índices `pg_trgm` para búsqueda parcial y tipos nativos (`uuid`, `jsonb`, `timestamptz`); Vite + React + TypeScript + Tailwind por arranque rápido, tipado en el cliente HTTP y utilidades sin CSS artesanal.

Las decisiones centrales son el registro atómico (texto y archivos en una sola petición, sin endpoint aislado de subida) y la búsqueda no bloqueante (respuesta inmediata con auditoría en segundo plano). La edad no se almacena: se deriva con `DATE_PART('year', AGE(fecha_nacimiento))`, exacto en cumpleaños y años bisiestos.

## 2. Almacenamiento de imágenes

Las imágenes se guardan en el sistema de archivos (`uploads/<uuid>.png|jpg|webp`) y la base conserva solo la ruta. El nombre del cliente se descarta; la extensión se deriva de los magic bytes inspeccionados en memoria con `file-type` (solo JPEG, PNG, WEBP), con límite de 5 MB por archivo. Al eliminar una persona se borran sus archivos con `fs.unlink` tolerante a `ENOENT`.

Desventajas asumidas: acopla los archivos a una máquina (sin escalado horizontal), sin CDN ni miniaturas, y el backup mezcla base y disco. Se migraría a almacenamiento de objetos (S3) con URLs firmadas ante múltiples instancias o contenedores efímeros.

## 3. Dirección IP del visitante

Orden de resolución: primero `CF-Connecting-IP` (inyectada por Cloudflare Tunnel); si la conexión TCP proviene del agente del túnel en localhost (caso ngrok), se toma la última entrada de `X-Forwarded-For`, que es la agregada por el borde del túnel; en conexión directa el `X-Forwarded-For` se ignora y se usa la IP del socket.

Es confiable detrás del túnel porque el valor considerado siempre lo fija infraestructura (el borde del túnel o el propio socket TCP): la primera entrada de `X-Forwarded-For`, falsificable por el cliente, nunca se utiliza.

## 4. Captcha

Cloudflare Turnstile con widget explícito (un token por búsqueda, nunca por tecla). El frontend envía `{ termino, captcha_token }` por `POST`; el backend verifica cada token contra `siteverify` con el secreto del servidor y responde `403` si falta o falla, antes de tocar la base. Llamar al endpoint directamente sin un token válido de un solo uso produce `400`/`403`, nunca datos: el listado (`GET /api/personas`) además rechaza cualquier parámetro `search`.

## 5. Notificación a Telegram

Cada búsqueda envía fecha y hora de Asunción, IP de origen, país, ciudad y cantidad de resultados. Se omite el término buscado (nombres, apellidos o documento), por ser información personal que no debe replicarse a una plataforma de terceros fuera de control propio; el término solo persiste en la tabla local `auditoria_busquedas` junto a la geolocalización cruda y el resultado del envío.

## 6. Fallos de servicios externos

Geolocalización (ip-api) y Telegram se llaman con timeout de 3 s y resolución IPv4 explícita, después de responder `200` al cliente (fire and forget). Ante error, timeout, cuota superada (`429`) o IP privada sin datos útiles, se registra el motivo en el `jsonb` crudo, la geografía figura como desconocida y `notificacion_telegram_exitosa` queda en `false`; la búsqueda nunca se bloquea y la fila de auditoría se inserta igual.

## 7. Retención del historial

El historial y las IP asociadas se conservan 30 días como máximo. Un cron diario (`0 3 * * *`) ejecuta `DELETE FROM auditoria_busquedas WHERE fecha_hora < NOW() - INTERVAL '30 days'`; la purga manual es `npm run cleanup`.

## 8. Alcance y trabajo futuro

Fuera de alcance por plazo: autenticación y roles, rate limiting más allá del captcha, suite de tests automatizados, migraciones versionadas y observabilidad. Con más plazo, el orden sería: tests del flujo atómico y del fire-and-forget, rate limiting por IP con backoff ante el `429` de ip-api, y migración del storage a S3 con URLs firmadas.

## 9. Puesta en marcha

```powershell
Copy-Item .env.example .env
Copy-Item client\.env.example client\.env
docker compose up -d          # PostgreSQL + esquema init.sql
npm install; node server.js   # API en :3000
npm run seed                  # 500 personas + 1000 imágenes
cd client; npm install; npm run dev   # SPA en :5173
```

| Variable | Descripción |
|---|---|
| `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_HOST`, `DB_PORT` | Conexión PostgreSQL |
| `PORT` | Puerto de la API (3000) |
| `CAPTCHA_SECRET` | Secreto de Turnstile (solo servidor) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Destino de notificaciones |
| `VITE_TURNSTILE_SITEKEY` | Clave pública del widget |

## 10. Referencia de la API

| Método | Ruta | Notas |
|---|---|---|
| POST | `/api/personas` | `multipart` atómico; `409` si el documento existe |
| GET | `/api/personas` | Paginado; `?search=` → `400` |
| GET | `/api/personas/:id` | Detalle con edad derivada |
| PUT | `/api/personas/:id` | Edición atómica, fotos opcionales |
| DELETE | `/api/personas/:id` | Borra registro y archivos |
| GET | `/uploads/:file` | Imagen con `Content-Type` imagen |
| POST | `/api/personas/buscar` | Requiere `captcha_token`; término 3–100 alfanumérico; tope fijo de 20 |
| GET | `/api/auditoria` | Historial DESC, filtros `q`, `desde`, `hasta` |

Los errores `500` son genéricos, sin trazas ni rutas internas. Datos 100% sintéticos (Faker + placeholders generados por código).

## 11. Uso de inteligencia artificial

Se usó IA para andamiaje, CRUD base, seed y UI. Correcciones manuales a sugerencias incorrectas o inseguras:

1. Endpoint aislado de subida (dejaba archivos huérfanos si el `INSERT` fallaba) → registro atómico: validar en memoria, insertar y recién entonces escribir.
2. `CHECK (fecha_nacimiento <= CURRENT_DATE)` → PostgreSQL exige funciones inmutables en `CHECK`; la restricción se movió al backend.
3. Confianza en `mimetype`/extensión del cliente → inspección de magic bytes con `file-type`.
4. `await` a ip-api/Telegram antes de responder → fire and forget posterior al `200`.
5. Lectura de la primera entrada de `X-Forwarded-For` → última entrada solo tras túnel local, o `CF-Connecting-IP`.
6. Término de búsqueda incluido en el mensaje de Telegram → excluido por PII.
