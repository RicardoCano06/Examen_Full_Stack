require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { fakerES, faker: fakerEN } = require('@faker-js/faker');
const pool = require('./db');

const faker = fakerES || fakerEN;

const TOTAL = 500;
const BATCH_SIZE = 50;
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// PNG válido de 1x1 (placeholder) en base64 convertido a Buffer.
// Solo Buffer + base64, sin dependencias gráficas pesadas: el mismo buffer se reutiliza.
const SAMPLE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const SAMPLE_IMAGE = Buffer.from(SAMPLE_PNG_BASE64, 'base64');

function fechaNacimientoPasada() {
  const d = faker.date.birthdate({ min: 18, max: 90, mode: 'age' });
  return d.toISOString().slice(0, 10);
}

function documentoUnico(usados) {
  let doc = '';
  do {
    doc = faker.string.numeric({ length: 8 });
  } while (usados.has(doc));
  usados.add(doc);
  return doc;
}

async function limpiar() {
  await pool.query('DELETE FROM personas');
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  const archivos = await fs.readdir(UPLOADS_DIR);
  await Promise.all(
    archivos.map((a) => fs.unlink(path.join(UPLOADS_DIR, a)).catch(() => {}))
  );
}

async function main() {
  console.log('Seed: limpiando tabla personas y carpeta uploads/ ...');
  await limpiar();

  const usados = new Set();
  let insertados = 0;

  for (let offset = 0; offset < TOTAL; offset += BATCH_SIZE) {
    const size = Math.min(BATCH_SIZE, TOTAL - offset);
    const filas = [];
    const escrituras = [];

    for (let i = 0; i < size; i++) {
      const nombres = faker.person.firstName();
      const apellidos = `${faker.person.lastName()} ${faker.person.lastName()}`;
      const nro_documento = documentoUnico(usados);
      const fecha_nacimiento = fechaNacimientoPasada();
      const uuid1 = uuidv4();
      const uuid2 = uuidv4();
      const ruta1 = `uploads/${uuid1}.png`;
      const ruta2 = `uploads/${uuid2}.png`;

      escrituras.push(
        fs.writeFile(path.join(UPLOADS_DIR, `${uuid1}.png`), SAMPLE_IMAGE),
        fs.writeFile(path.join(UPLOADS_DIR, `${uuid2}.png`), SAMPLE_IMAGE)
      );
      filas.push([nombres, apellidos, nro_documento, fecha_nacimiento, ruta1, ruta2]);
    }

    await Promise.all(escrituras);

    // Batch insert: 1 sola query por lote para no agotar conexiones ni memoria.
    const values = [];
    const params = [];
    filas.forEach((f, idx) => {
      const b = idx * 6;
      values.push(`($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6})`);
      params.push(...f);
    });
    await pool.query(
      `INSERT INTO personas (nombres, apellidos, nro_documento, fecha_nacimiento, ruta_foto_frente, ruta_foto_dorso) VALUES ${values.join(', ')}`,
      params
    );

    insertados += filas.length;
    console.log(`  lote ${offset / BATCH_SIZE + 1}: ${insertados}/${TOTAL}`);
  }

  console.log(`Seed completo: ${insertados} personas con 2 imágenes cada una.`);
  await pool.end();
}

if (require.main === module) {
  main().catch(async (err) => {
    console.error('Error en seed:', err.message);
    try {
      await pool.end();
    } catch {
      // cierre best-effort
    }
    process.exit(1);
  });
}

module.exports = { SAMPLE_IMAGE, TOTAL, BATCH_SIZE, main, limpiar };
