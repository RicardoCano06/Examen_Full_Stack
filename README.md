# Evaluación Técnica Full Stack — Ricardo Cano

Sistema de registro de personas con documentos de identidad, búsqueda auditada con
notificación a Telegram y panel de administración. El backend expone una API REST
en Express con PostgreSQL y almacenamiento de imágenes en el sistema de archivos;
el frontend es una aplicación React con Vite y Tailwind CSS.

## Índice

1. [Descripción y arquitectura](#1-descripción-y-arquitectura)
2. [Stack tecnológico y justificación](#2-stack-tecnológico-y-justificación)
3. [Estructura del repositorio](#3-estructura-del-repositorio)
4. [Requisitos previos](#4-requisitos-previos)
5. [Variables de entorno](#5-variables-de-entorno)
6. [Puesta en marcha local](#6-puesta-en-marcha-local)
7. [Referencia de la API](#7-referencia-de-la-api)
8. [Imágenes: almacenamiento, desventajas y umbral de cambio](#8-imágenes-almacenamiento-desventajas-y-umbral-de-cambio)
9. [IP del visitante detrás del túnel](#9-ip-del-visitante-detrás-del-túnel)
10. [Captcha: mecanismo, validación y por qué no es eludible](#10-captcha-mecanismo-validación-y-por-qué-no-es-eludible)
11. [Telegram: qué se envía, qué se omite y por qué](#11-telegram-qué-se-envía-qué-se-omite-y-por-qué)
12. [Fallos de geolocalización o Telegram](#12-fallos-de-geolocalización-o-telegram)
13. [Política de retención de datos](#13-política-de-retención-de-datos)
14. [Fuera de alcance y trabajo futuro](#14-fuera-de-alcance-y-trabajo-futuro)
15. [Scripts disponibles](#15-scripts-disponibles)
16. [Uso de inteligencia artificial](#16-uso-de-inteligencia-artificial)

## 1. Descripción y arquitectura

Flujo monolítico en dos piezas: API Express sin ORM (SQL puro vía `pg`) y SPA
React. Las decisiones centrales son la **atomicidad del registro** (texto +
archivos en una sola petición, sin endpoint aislado de subida) y la
**búsqueda no bloqueante** (respuesta inmediata + auditoría fire and forget).
La edad nunca se almacena: se deriva en SQL con
`DATE_PART('year', AGE(fecha_nacimiento))`.

## 2. Stack tecnológico y justificación

| Capa | Elección | Por qué |
|------|----------|---------|
| API | Express 4 | Suficiente para un CRUD evaluable, sin la sobrecarga de un framework pesado |
| BD | PostgreSQL 15 + SQL puro (`pg`) | Control total del esquema, índices `pg_trgm` y tipos (`jsonb`, `uuid`); un ORM ocultaría justo lo que el examen evalúa |
| Subida | Multer `memoryStorage`, 5 MB | Permite validar magic bytes **antes** de tocar el disco; `diskStorage` escribiría archivos no validados |
| Validación | `file-type` | Inspecciona el contenido real en lugar del `mimetype` declarado, que el cliente puede falsificar |
| Frontend | Vite + React + TS + Tailwind | Arranque rápido, tipado en el cliente HTTP y utilidades sin CSS artesanal |
| Tareas | `node-cron` | Retención diaria sin infraestructura adicional |

## 3. Estructura del repositorio

```text
.
├── server.js               # Arranque Express, middlewares y montaje de rutas
├── db.js                   # Pool de conexiones PostgreSQL
├── init.sql                # Esquema: personas + auditoria_busquedas + índices
├── docker-compose.yml      # PostgreSQL 15 (aplica init.sql automáticamente)
├── seed.js                 # Carga masiva: 500 personas, 1000 imágenes
├── cleanup.js              # Purga de auditoría mayor a 30 días (+ cron diario)
├── controllers/            # personas.js, busqueda.js, auditoria.js
├── routes/                 # personas.js, auditoria.js
├── middlewares/            # upload.js (multer en memoria + magic bytes)
├── uploads/                # Imágenes generadas (no versionado)
└── client/                 # Frontend Vite + React + TS + Tailwind
    ├── src/api/            # Cliente Axios
    ├── src/components/     # Button, Input, Table, Sidebar, Toast, Spinner
    └── src/pages/          # PersonasList, Registrar, Detalle, Editar, Auditoria
```

## 4. Requisitos previos

- Node.js v18 o superior.
- PostgreSQL 15+ accesible en el puerto 5432 (servicio nativo o contenedor).
- Credenciales de Cloudflare Turnstile y bot de Telegram para el flujo completo
  de búsqueda (el resto del sistema funciona sin ellas).

## 5. Variables de entorno

```powershell
Copy-Item .env.example .env
Copy-Item client\.env.example client\.env
```

| Variable (`backend`) | Descripción |
|---|---|
| `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_HOST`, `DB_PORT` | Conexión PostgreSQL |
| `PORT` | Puerto de la API (defecto `3000`) |
| `CAPTCHA_SECRET` | Secreto de Cloudflare Turnstile (solo servidor) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Destino de notificaciones |

| Variable (`client/.env`) | Descripción |
|---|---|
| `VITE_TURNSTILE_SITEKEY` | Clave pública del widget (la secreta nunca sale del backend) |

## 6. Puesta en marcha local

```powershell
docker compose up -d          # o PostgreSQL nativo + psql -f init.sql
npm install; node server.js   # API en :3000
npm run seed                  # 500 personas + 1000 PNG en lotes de 50 (con relleno verificado)
cd client; npm install; npm run dev   # SPA en :5173 (proxy /api → :3000)
```

## 7. Referencia de la API

| Método | Ruta | Notas |
|---|---|---|
| GET | `/health` | Estado del servicio |
| POST | `/api/personas` | `multipart` atómico; `409` si el documento existe |
| GET | `/api/personas` | Navegación paginada; `?search=` → `400` (toda búsqueda exige captcha) |
| GET | `/api/personas/:id` | Detalle con edad derivada |
| PUT | `/api/personas/:id` | Edición atómica (fotos opcionales, reemplazo por lado) |
| DELETE | `/api/personas/:id` | Borra registro y archivos (`ENOENT` tolerado) |
| GET | `/uploads/:uuid.png` | Imagen con `Content-Type` imagen (regex estricta, sin traversal) |
| POST | `/api/personas/buscar` | Requiere `captcha_token`; `403` si falla |
| GET | `/api/auditoria` | Historial paginado DESC + filtros `q`, `desde`, `hasta` |

Los errores `500` son genéricos: nunca exponen trazas ni rutas internas.

## 8. Imágenes: almacenamiento, desventajas y umbral de cambio

Se guardan en el disco local (`uploads/<uuid>.png|jpg|webp`) y la base solo
conserva la ruta. La extensión se deriva de los magic bytes reales, nunca del
nombre original, y el nombre es un `uuidv4` para evitar colisiones y path
traversal. Este enfoque mantiene a PostgreSQL ligero y es suficiente para una
instancia única evaluable.

**Desventajas asumidas**: no escala horizontalmente (el disco es local a una
máquina), no hay CDN ni redimensionado, y el backup mezcla BD + archivos.

**Visualización**: `GET /uploads/:file` solo acepta nombres `uuid.png|jpg|webp`,
responde siempre `Content-Type: image/*` (nunca ejecutable), rechaza traversal
con `404` y el detalle de persona muestra frente/dorso en tarjetas.

**Cambiaría el enfoque** ante un segundo servidor, despliegue en contenedores
efímeros o necesidad de servir imágenes al público: migraría a almacenamiento
de objetos compatible con S3 (con la BD guardando clave + URL firmada de
lectura) y un worker de miniaturas.

## 9. IP del visitante detrás del túnel

Se lee estrictamente desde `CF-Connecting-IP`, cabecera inyectada por la
infraestructura de Cloudflare Tunnel y no por el cliente. `X-Forwarded-For` se
ignora por completo porque cualquier visitante puede falsificarla. Solo como
respaldo para desarrollo local se usa `req.socket.remoteAddress`. Es confiable
detrás del túnel precisamente porque el valor lo fija el borde de la red, no
el origen de la petición.

## 10. Captcha: mecanismo, validación y por qué no es eludible

Se usa **Cloudflare Turnstile** con widget explícito integrado en la barra de
búsqueda del listado: el token se solicita una vez antes de pulsar "Buscar",
nunca por cada tecla (los tokens son de un solo uso, por lo que no existe
búsqueda en vivo: sería incompatible con el modelo anti-bot). El frontend envía
`{ termino, captcha_token }` por `POST` (no viajan en la URL ni quedan en
logs). El backend verifica cada token contra
`challenges.cloudflare.com/turnstile/v0/siteverify` con el `CAPTCHA_SECRET`
del servidor; si la verificación falla o falta el token, responde `403` antes
de buscar.

**No existe bypass**: `GET /api/personas` es solo navegación paginada y
rechaza con `400` cualquier parámetro `search`. La única vía de filtrado es
`POST /api/personas/buscar` con captcha válido, y cada ejecución queda
auditada. Llamar a cualquier endpoint directamente sin token produce
`400`/`403`, nunca datos filtrados. Se acepta `CAPTCHA_SECRET` (o
`TURNSTILE_SECRET_KEY` como alternativa); el token se recorta y acota.

**Sanitización general**: todo texto se recorta; nombres y apellidos admiten
100 caracteres y el documento 20 (también con `maxLength` en el frontend);
multer acota campos de texto (64KB, máx. 20 campos, 2 archivos); los `:id` se
validan como UUID (`400` si son inválidos); el filtro `q` de auditoría escapa
comodines `LIKE`; toda consulta SQL es parametrizada y la IP persistida debe
tener formato válido.

## 11. Telegram: qué se envía, qué se omite y por qué

**Se envía**: fecha y hora de Asunción (`es-PY`, `America/Asuncion`), IP de
origen, país, ciudad y cantidad de resultados.

**Se omite**: el término buscado. Puede ser un número de documento o un nombre
completo (PII); replicarlo a los servidores de Telegram violaría el principio
de minimización de datos. El término solo persiste en `auditoria_busquedas`,
junto a la geolocalización cruda (`jsonb`) y el flag
`notificacion_telegram_exitosa`.

## 12. Fallos de geolocalización o Telegram

Ambas llamadas llevan timeout estricto de 3 s con `AbortController` y corren
**después** de responder `200` al cliente (fire and forget), por lo que una
demora externa jamás cuelga la búsqueda. Se solicitan país, ciudad, proveedor,
organización y coordenadas (`country,city,isp,org,lat,lon`). Si `ip-api.com`
devuelve HTTP distinto de 2xx (p. ej. `429` por cuota gratuita superada),
`status != success` (IPs privadas/locales sin datos útiles) o la red falla, el
motivo queda almacenado en el `jsonb` crudo y la geografía se informa como
desconocida; no hay reintentos para no agravar el límite. Si Telegram falla o
no hay credenciales, `notificacion_telegram_exitosa` queda en `false`. La fila
de auditoría se inserta de todos modos y cualquier excepción se limita a
`console.error` sin tocar la respuesta ya enviada.

## 13. Política de retención de datos

El historial y las IP asociadas se conservan **30 días** como máximo. Un cron
diario (`0 3 * * *`) ejecuta
`DELETE FROM auditoria_busquedas WHERE fecha_hora < NOW() - INTERVAL '30 days'`;
la purga manual es `npm run cleanup`. Solo se conservarían métricas anónimas
de volumen para análisis de tráfico.

## 14. Fuera de alcance y trabajo futuro

Por tiempo quedaron fuera: autenticación y roles, rate limiting en
`POST /api/personas/buscar` más allá del captcha, suite de tests automatizados,
migraciones versionadas del esquema y observabilidad (logs estructurados,
métricas). Con más plazo, el orden sería: tests del flujo atómico y del
fire-and-forget, rate limiting por IP con backoff ante el `429` de ip-api,
y migración del storage a S3 cuando haya más de una instancia.

## 15. Scripts disponibles

| Script | Comando | Descripción |
|---|---|---|
| API | `node server.js` | Inicia el backend (o `npm start` / `npm run dev`) |
| Seed | `npm run seed` | 500 personas + 1000 imágenes en lotes de 50, con conteo final verificado |
| Limpieza | `npm run cleanup` | Purga manual de auditoría mayor a 30 días |
| Frontend | `npm run dev` / `npm run build` | Dev en `:5173` / `tsc` + compilado |

## 16. Uso de inteligencia artificial

Se usó Muse Spark (andamiaje, CRUD, seed, UI) y Gemini (apoyo puntual). Es
concreto dónde la sugerencia automática era incorrecta o insegura y qué se
corrigió a mano:

1. **Endpoint aislado `/api/upload`**: la IA propuso subir primero y crear
   después, dejando archivos huérfanos si el `INSERT` fallaba. Se eliminó y se
   implementó el registro atómico (validar en memoria → `INSERT` → escribir).
2. **`CHECK (fecha_nacimiento <= CURRENT_DATE)`**: PostgreSQL exige funciones
   inmutables en `CHECK` y rechaza `CURRENT_DATE`. Se quitó la restricción y la
   validación de fecha futura vive en el backend.
3. **Confianza en `mimetype`/extensión**: la primera validación sugerida
   aceptaba la cabecera del cliente. Se reescribió a magic bytes con
   `file-type` y extensión derivada del contenido.
4. **`await` a ip-api/Telegram antes de responder**: colgaba la búsqueda ante
   latencia externa. Se movió a fire and forget posterior al `200`.
5. **Lectura de `X-Forwarded-For`**: falsificable por el cliente. Se cambió a
   `CF-Connecting-IP` estricta con fallback solo local.
6. **Término de búsqueda a Telegram**: la sugerencia inicial lo incluía. Se
   excluyó por PII; solo viajan IP, geografía, fecha y conteo.
