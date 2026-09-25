# Evaluación Técnica Full Stack — Ricardo Cano

Sistema de registro de personas con documentos de identidad, búsqueda auditada con notificación a Telegram y panel de administración. El backend expone una API REST en Express con PostgreSQL y almacenamiento de imágenes en el sistema de archivos; el frontend es una aplicación React con Vite y Tailwind CSS.

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

Flujo monolítico en dos piezas: API Express sin ORM (SQL puro vía pg) y SPA React. Las decisiones centrales son la atomicidad del registro (texto + archivos en una sola petición, sin endpoint aislado de subida) y la búsqueda no bloqueante (respuesta inmediata + auditoría fire and forget). La edad nunca se almacena: se deriva en SQL con `DATE_PART('year', AGE(fecha_nacimiento))`; `AGE()` es calendario-exacto (cumpleaños y 29 de febrero correctos) sin lógica en el cliente.

## 2. Stack tecnológico y justificación

| Capa | Elección | Por qué |
|------|----------|---------|
| API | Express 4 | Suficiente para un CRUD rápido, sin la sobrecarga de un framework pesado. Maneja bien peticiones I/O asíncronas. |
| BD | PostgreSQL 15 + SQL (pg) | Control total del esquema y tipos. Un ORM ocultaría el dominio de SQL que el examen requiere evaluar. |
| Subida | Multer memoryStorage (5MB) | Permite validar magic bytes antes de escribir en disco, garantizando que no ingresen archivos maliciosos al servidor. |
| Validación | file-type | Inspecciona la firma real del archivo en lugar del mimetype HTTP, que es fácilmente falsificable por el cliente. |
| Frontend | Vite + React + TS + Tailwind | Arranque rápido, tipado seguro para el estado de los componentes y utilidades sin CSS artesanal. |

## 3. Estructura del repositorio

```plaintext
.
├── server.js               # Arranque Express, middlewares y montaje de rutas
├── db.js                   # Pool de conexiones PostgreSQL
├── init.sql                # Esquema: personas + auditoria_busquedas + índices
├── docker-compose.yml      # PostgreSQL 15 (aplica init.sql automáticamente)
├── seed.js                 # Carga masiva: 500 personas, 1000 imágenes
├── cleanup.js              # Purga de auditoría mayor a 30 días (+ cron diario)
├── controllers/            # Lógica de negocio (personas, busqueda, auditoria)
├── routes/                 # Definición de endpoints REST
├── middlewares/            # upload.js (multer en memoria + magic bytes)
├── uploads/                # Imágenes persistidas (ignorado en Git)
└── client/                 # Frontend Vite + React + TS + Tailwind
    ├── src/api/            # Cliente Axios
    ├── src/components/     # Button, Input, Table, Sidebar, Toast, Spinner, Modal
    └── src/pages/          # PersonasList, Detalle, Editar, Auditoria
```

## 4. Requisitos previos

Node.js v18 o superior.
PostgreSQL 15+ accesible en el puerto 5432 (servicio nativo o contenedor Docker).
Credenciales de Cloudflare Turnstile y bot de Telegram para el flujo completo de búsqueda.

## 5. Variables de entorno

Cree los archivos .env a partir de los ejemplos proporcionados. Toda credencial sensible se mantiene fuera del control de versiones.

```powershell
Copy-Item .env.example .env
Copy-Item client\.env.example client\.env
```

| Variable (backend) | Descripción |
|---|---|
| DB_USER, DB_PASSWORD, DB_NAME, DB_HOST, DB_PORT | Conexión a PostgreSQL |
| PORT | Puerto de la API (defecto 3000) |
| CAPTCHA_SECRET | Secreto de Cloudflare Turnstile (solo servidor) |
| TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID | Destino de notificaciones |

| Variable (client/.env) | Descripción |
|---|---|
| VITE_TURNSTILE_SITEKEY | Clave pública del widget |

## 6. Puesta en marcha local

```powershell
docker compose up -d          # Levanta PostgreSQL e inyecta init.sql
npm install; node server.js   # Levanta la API en el puerto 3000
npm run seed                  # Genera 500 personas sintéticas requeridas
cd client; npm install; npm run dev   # Levanta la SPA en el puerto 5173
```

Para pruebas remotas, el frontend se expone mediante un túnel de Ngrok `ngrok http --domain=tu-dominio 5173`.

## 7. Referencia de la API

| Método | Ruta | Notas |
|---|---|---|
| POST | `/api/personas` | Subida multipart atómica. 409 si el documento ya existe. |
| GET | `/api/personas` | Listado paginado (LIMIT/OFFSET). |
| GET | `/api/personas/:id` | Detalle con cálculo de edad derivado. |
| PUT | `/api/personas/:id` | Edición atómica (fotos opcionales). |
| DELETE | `/api/personas/:id` | Borra el registro y físicamente los archivos del disco (fs.unlink). |
| POST | `/api/personas/buscar` | Exige captcha_token. Búsqueda protegida por límite de caracteres. |
| GET | `/api/auditoria` | Historial paginado DESC. |

Los errores 500 son genéricos: nunca exponen trazas de excepción ni rutas internas.

## 8. Imágenes: almacenamiento, desventajas y umbral de cambio

Las imágenes se almacenan físicamente en el sistema de archivos del servidor (/uploads) y en la base de datos se guarda únicamente la ruta generada (ej. uuidv4.png).
Validación y seguridad: El nombre enviado por el cliente es descartado. La extensión final se deriva exclusivamente tras examinar los magic bytes del archivo en memoria, garantizando que solo se escriban imágenes reales (JPEG, PNG, WEBP).
Desventajas asumidas: Este enfoque acopla los archivos físicos a una máquina específica, complicando el escalado horizontal, e impide una distribución rápida mediante CDN.
Cuándo cambiaría el enfoque: Si la infraestructura pasara a usar contenedores efímeros o balanceadores de carga múltiples, migraría a un servicio de almacenamiento de objetos (como AWS S3) guardando las URLs en PostgreSQL.

## 9. IP del visitante detrás del túnel

Al estar expuesta mediante Ngrok, la aplicación funciona detrás de un proxy inverso. Si se leyera la propiedad estándar del socket TCP, todas las conexiones registrarían la IP local del agente del túnel.
Para resolverlo de forma confiable, el backend intercepta la cabecera HTTP X-Forwarded-For inyectada por la infraestructura de Ngrok. Ngrok actúa como intermediario seguro y añade la verdadera IP pública del visitante al final de esta cabecera antes de enrutar el tráfico al entorno local, ignorando los intentos de falsificación directa desde el cliente.

## 10. Captcha: mecanismo, validación y por qué no es eludible

Se utiliza Cloudflare Turnstile para la verificación anti-automatización. El frontend solicita un token una única vez antes de emitir la búsqueda HTTP, logrando un equilibrio de usabilidad (no exige resolución por cada tecla ingresada).
No es eludible porque la validación ocurre estrictamente en el backend. El token viaja en el cuerpo del POST y el servidor lo verifica contra la API de Cloudflare usando una clave secreta inaccesible al público. Si un evaluador o script intenta llamar a /api/personas/buscar directamente desde una terminal (cURL/Postman) o envía un token expirado/falso, el middleware interrumpe el flujo con un error 403 antes de tocar la base de datos.

## 11. Telegram: qué se envía, qué se omite y por qué

Se envía: Fecha y hora (en zona horaria America/Asuncion), IP de origen, ciudad, país detectado y la cantidad de resultados obtenidos.
Se omite: El término exacto de búsqueda (nombres, apellidos o documento).
Fundamento: Telegram es una plataforma administrada por terceros fuera del control de la infraestructura de la aplicación. Enviar el parámetro de búsqueda expondría Información de Identificación Personal (PII) a un entorno externo, violando principios básicos de privacidad. El término de búsqueda exacto solo persiste de forma segura en la tabla local auditoria_busquedas.

## 12. Fallos de geolocalización o Telegram

Las llamadas a las APIs de IP-API y Telegram se ejecutan con un tiempo de espera máximo definido (timeout de 3 segundos). Además, estas rutinas están diseñadas bajo un patrón fire-and-forget que se ejecuta después de que el backend ya ha devuelto el código 200 y los resultados al usuario.
Si IP-API agota su límite gratuito de peticiones o Telegram no responde, la falla se registra silenciosamente en el log y el flag notificacion_telegram_exitosa se marca como false, pero la búsqueda del usuario nunca se interrumpe, se rompe, ni se congela.

## 13. Política de retención de datos

El historial de búsquedas y las IPs asociadas se conservan por un máximo de 30 días. Existe una rutina de limpieza (cleanup.js) programada que ejecuta un DELETE en la tabla auditoria_busquedas para purgar registros antiguos, asegurando que la recolección de datos no crezca de forma indefinida y cumpla con políticas de minimización de datos.

## 14. Fuera de alcance y trabajo futuro

Debido al plazo de entrega, no se implementó un sistema de autenticación (JWT) para proteger el panel administrativo, ni un rate-limiting estricto (vía Redis) para la creación de registros. En un entorno de producción real, el panel de auditoría no debería ser público y requeriría control de acceso basado en roles (RBAC).

## 15. Scripts disponibles

| Script | Comando | Descripción |
|---|---|---|
| Backend | `node server.js` | Inicia la API (o npm run dev) |
| Seed | `npm run seed` | Carga de 500 registros y archivos de prueba |
| Purga | `npm run cleanup` | Ejecuta la política de retención manual |
| Frontend | `npm run dev` | Inicia Vite en el puerto 5173 |

## 16. Uso de inteligencia artificial

Se utilizaron asistentes de IA (Muse / Gemini) para el andamiaje del proyecto, generación de la interfaz con Tailwind CSS y escritura sintáctica del CRUD base. Durante el desarrollo, se corrigieron manualmente los siguientes fallos lógicos sugeridos por la IA:
Almacenamiento de archivos: La IA propuso confiar en el mimetype enviado por el navegador. Esto es inseguro. Se corrigió forzando la lectura en memoria de los magic bytes mediante la librería file-type antes de la escritura en disco.
Paginación SQL: Las consultas iniciales autogeneradas carecían de cláusula OFFSET acoplada al query param, lo que rompía el listado con gran volumen. Se reescribió la consulta para asegurar bloques predecibles.
Bloqueo asíncrono: La IA sugirió colocar await a las peticiones externas de Telegram antes de retornar los datos de búsqueda, lo que hubiera colgado el frontend si la API de terceros fallaba. Se refactorizó aislando la notificación del hilo de respuesta.
