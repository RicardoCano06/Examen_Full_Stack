// Formato es-PY: puntos de millar para documentos (40381719 -> 4.038.171).
// Se eliminan ceros a la izquierda (01234567 -> 1.234.567).
export function puntosMiles(valor: string): string {
  const digitos = valor.replace(/\D/g, '').replace(/^0+/, '');
  if (!digitos) return valor;
  return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Solo fecha es-PY con ceros consistentes (23/03/1998), sin hora.
// Parsea el YYYY-MM-DD como fecha local para evitar desfase UTC.
export function soloFecha(iso: string): string {
  const base = iso.slice(0, 10);
  const [y, m, d] = base.split('-').map(Number);
  if (!y || !m || !d) return base;
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${dd}/${mm}/${y}`;
}
