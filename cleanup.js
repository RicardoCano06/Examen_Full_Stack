// Política de retención: la tabla auditoria_busquedas solo conserva 30 días.
// Uso: `npm run cleanup` (ejecución única) o programado una vez al día vía node-cron.
const pool = require('./db');

const RETENTION_SQL = `DELETE FROM auditoria_busquedas WHERE fecha_hora < NOW() - INTERVAL '30 days'`;

async function purgarAuditoria() {
  const result = await pool.query(RETENTION_SQL);
  return result.rowCount || 0;
}

function iniciarRetencion() {
  // Se carga aquí para no obligar a node-cron en scripts de un solo uso/test.
  const cron = require('node-cron');
  // Todos los días a las 03:00
  cron.schedule('0 3 * * *', async () => {
    try {
      const eliminados = await purgarAuditoria();
      console.log(`[retencion] auditoría purgada: ${eliminados} registros >30 días eliminados`);
    } catch (err) {
      console.error('[retencion] error al purgar auditoría:', err.message);
    }
  });
}

if (require.main === module) {
  purgarAuditoria()
    .then((n) => {
      console.log(`Limpieza manual: ${n} registros >30 días eliminados`);
      return pool.end();
    })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error en limpieza manual:', err.message);
      process.exit(1);
    });
}

module.exports = { purgarAuditoria, iniciarRetencion, RETENTION_SQL };
