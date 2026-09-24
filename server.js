require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const personasRoutes = require('./routes/personas');
const auditoriaRoutes = require('./routes/auditoria');

// La carpeta debe existir al arrancar: el INSERT compensatorio escribe aquí
// solo después del éxito en BD. Sin esto, fs.writeFile fallaría en la práctica.
fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// CRUD atómico de personas (texto + 2 imágenes en un solo multipart).
app.use('/api/personas', personasRoutes);

// Historial de auditoría de búsquedas (paginado, fecha descendente).
app.use('/api/auditoria', auditoriaRoutes);

// Visualización segura de imágenes: solo nombres uuid + extensión validada,
// con Content-Type imagen (nunca ejecutable) y sin directory traversal.
app.get('/uploads/:file', (req, res) => {
  const f = req.params.file;
  if (!/^[0-9a-fA-F-]{36}\.(png|jpg|webp)$/.test(f)) {
    return res.status(404).json({ error: 'Recurso no encontrado' });
  }
  const mime = f.endsWith('.png') ? 'image/png' : f.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  res.type(mime);
  res.sendFile(path.join(__dirname, 'uploads', f), (err) => {
    if (err) res.status(404).json({ error: 'Recurso no encontrado' });
  });
});

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ error: 'Recurso no encontrado' });
});

// Middleware GLOBAL de manejo seguro de errores.
// Nunca expone stack traces, rutas internas ni mensajes de sistema.
app.use((err, req, res, next) => {
  // Multer: límite de tamaño y errores de subida -> 400 genérico
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Archivo excede el límite de 5MB' });
    }
    return res.status(400).json({ error: 'Error en la subida del archivo' });
  }

  if (err && [400, 403, 404, 409].includes(err.statusCode)) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Log interno (servidor) sin filtrar nada al cliente
  console.error(err);

  return res.status(500).json({ error: 'Error interno del servidor' });
});

if (require.main === module) {
  // Retención diaria de auditoría (03:00). No bloquea el arranque si falla.
  try {
    require('./cleanup').iniciarRetencion();
  } catch (err) {
    console.error('No se pudo programar la retención:', err.message);
  }
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}`);
  });
}

module.exports = app;
