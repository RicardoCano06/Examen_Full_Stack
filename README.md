
Evaluación Técnica Full Stack - Ricardo Cano

1. Instrucciones de Despliegue (Entorno Local)
   Para garantizar la reproducibilidad sin depender de motores de virtualización inestables en Windows, la inicialización de la base de datos está completamente automatizada mediante Node.js.

Requisitos previos:

Node.js v18+

PostgreSQL (instalación nativa en el puerto 5432)

Pasos:

Renombrar .env.example a .env en el directorio raíz (backend) y /client (frontend), completando las credenciales locales.

Levantar la infraestructura de base de datos ejecutando: npm run setup:db (crea la BD y las tablas automáticamente).

Generar la data sintética exigida (500 registros, 1000 imágenes): npm run seed.

Iniciar Backend: node server.js

Iniciar Frontend: cd client && npm run dev

2. Decisiones de Arquitectura y Seguridad
   Almacenamiento Local (File System): Las imágenes se guardan en el disco (/uploads) y no en la BD. Esto mantiene a PostgreSQL ligero, asegurando tiempos de respuesta en milisegundos para el listado de 500 registros.

Validación Estricta de Archivos: No se confía en la extensión ni en el tipo MIME que envía el cliente. El backend lee los magic bytes del archivo en memoria para asegurar que sea un PNG/JPG válido antes de tocar el disco, mitigando ataques de inyección de código.

Extracción de IP en Túnel (Ngrok): Debido a bloqueos de resolución DNS del proveedor local hacia trycloudflare.com, utilicé Ngrok como mecanismo equivalente. Dado que Ngrok reescribe las cabeceras, la IP del cliente se extrae estrictamente desde el primer valor de X-Forwarded-For, mitigando falsificaciones de origen.

Privacidad de Datos: La auditoría que se dispara hacia Telegram ejecuta un patrón Fire and Forget (no bloquea la respuesta al usuario). Por reglas estrictas de privacidad (PII), se envía la IP y la geolocalización, pero se omite intencionalmente el término de búsqueda.

3. Uso de Inteligencia Artificial
   La generación de código base y scripts de datos sintéticos se agilizó utilizando Muse Spark y Gemini. Sin embargo, la intervención manual fue crítica en:

Refactorización del Bot: Moví la lógica de Telegram y Geolocalización a procesos asíncronos para evitar cuellos de botella en la latencia de la búsqueda principal.

Seguridad: Reescribí la validación de imágenes sugerida por la IA para forzar la lectura de buffers en lugar de confiar en cabeceras HTTP vulnerables.
