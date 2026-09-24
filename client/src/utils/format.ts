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

// Máscara DD/MM/AAAA para escritura (solo dígitos + barras automáticas).
export function mascaraFecha(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8);
  let out = d.slice(0, 2);
  if (d.length > 2) out += '/' + d.slice(2, 4);
  if (d.length > 4) out += '/' + d.slice(4);
  return out;
}

// Valida fecha calendario real y devuelve ISO YYYY-MM-DD, o null si inválida.
export function parseFechaES(v: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ISO YYYY-MM-DD -> DD/MM/AAAA para mostrar en el input.
export function isoAFechaES(iso: string): string {
  const b = iso.slice(0, 10);
  const [y, m, d] = b.split('-');
  return y && m && d ? `${d}/${m}/${y}` : '';
}
