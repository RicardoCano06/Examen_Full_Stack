require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const zlib = require('zlib');
const { v4: uuidv4 } = require('uuid');
const { fakerES, faker: fakerEN } = require('@faker-js/faker');
const pool = require('./db');

const faker = fakerES || fakerEN;

const TOTAL = 500;
const BATCH_SIZE = 50;
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Placeholder gráfico 240x180 generado por código (fondo gris, marco y franjas),
// construido como PNG válido solo con zlib de Node: sin dependencias gráficas.
// El mismo buffer se reutiliza en las 1000 imágenes del seed.
function crc32(buf) {
  let table = crc32.t;
  if (!table) {
    table = crc32.t = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function buildPlaceholder() {
  const W = 240;
  const H = 180;
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0; // byte de filtro: ninguno
    for (let x = 0; x < W; x++) {
      const o = y * (W * 3 + 1) + 1 + x * 3;
      const border = x < 6 || y < 6 || x >= W - 6 || y >= H - 6;
      const stripe = ((x + y) >> 4) % 2 === 0;
      let v = stripe ? 205 : 228;
      if (border) v = 110;
      raw[o] = v;
      raw[o + 1] = v;
      raw[o + 2] = v;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // profundidad de color
  ihdr[9] = 2; // color verdadero RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const SAMPLE_IMAGE = buildPlaceholder();

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
      const apellidos = faker.person.lastName(); // ya viene doble ("Calvillo Monroy")
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
