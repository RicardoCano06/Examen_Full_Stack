const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const { v4: uuidv4 } = require('uuid');

// MIME types permitidos según magic bytes reales (NO según mimetype del cliente)
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB por archivo
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// Multer EXCLUSIVAMENTE con memoria.
// Se valida el buffer ANTES de escribir a disco con fs.
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  // Aceptamos el archivo aquí y validamos después por magic bytes.
  // NUNCA confiar en file.mimetype ni en la extensión original en este punto.
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
});

async function detectRealType(buffer) {
  // file-type v21 es ESM puro: se importa dinámicamente desde CommonJS.
  const { fileTypeFromBuffer } = await import('file-type');
  return fileTypeFromBuffer(buffer);
}

// Valida magic bytes de un buffer SIN escribir a disco.
// Retorna { mime, ext } si es JPEG/PNG/WEBP real. Lanza 400 en caso contrario.
// NUNCA usa file.mimetype ni la extensión original.
async function validateImageBuffer(buffer) {
  if (!buffer || buffer.length === 0) {
    throw httpError(400, 'Archivo vacío o no recibido');
  }

  let realType;
  try {
    realType = await detectRealType(buffer);
  } catch {
    throw httpError(400, 'No se pudo validar el tipo de archivo');
  }

  if (!realType || !ALLOWED_MIMES.has(realType.mime)) {
    throw httpError(400, 'Tipo de archivo no permitido. Solo JPEG, PNG o WEBP');
  }

  return { mime: realType.mime, ext: MIME_TO_EXT[realType.mime] };
}

// Valida magic bytes y, si es válido, guarda en uploads/ con nombre uuidv4.
// Devuelve la ruta relativa a guardar en BD (ej: uploads/<uuid>.jpg).
async function saveValidatedFile(file) {
  if (!file || !file.buffer) {
    throw httpError(400, 'Archivo vacío o no recibido');
  }
  const { ext } = await validateImageBuffer(file.buffer);
  const safeFilename = `${uuidv4()}${ext}`;
  const absoluteDir = UPLOADS_DIR;
  const absolutePath = path.join(absoluteDir, safeFilename);

  // Defensa extra contra path traversal (el nombre es generado, pero se verifica igual)
  if (!absolutePath.startsWith(absoluteDir)) {
    throw httpError(400, 'Nombre de archivo inválido');
  }

  await fs.mkdir(absoluteDir, { recursive: true });
  await fs.writeFile(absolutePath, file.buffer);

  return `uploads/${safeFilename}`;
}

module.exports = {
  upload,
  // Multipart atómico de personas: texto + 2 archivos en la misma petición.
  uploadPersonaFiles: upload.fields([
    { name: 'foto_frente', maxCount: 1 },
    { name: 'foto_dorso', maxCount: 1 },
  ]),
  saveValidatedFile,
  validateImageBuffer,
  detectRealType,
  UPLOADS_DIR,
  ALLOWED_MIMES,
  MAX_FILE_SIZE,
};
