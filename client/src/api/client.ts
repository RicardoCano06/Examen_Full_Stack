import axios from 'axios';

// Base relativa: en desarrollo Vite redirige /api al backend (ver vite.config.ts).
export const api = axios.create({ baseURL: '/api' });

export interface Persona {
  id: string;
  nombres: string;
  apellidos: string;
  nro_documento: string;
  fecha_nacimiento: string;
  ruta_foto_frente: string;
  ruta_foto_dorso: string;
  edad?: number;
}

export interface Pagina<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RegistroAuditoria {
  id: string;
  fecha_hora: string;
  termino_buscado: string;
  cantidad_resultados: number;
  ip_origen: string;
  info_geolocalizacion: unknown;
  notificacion_telegram_exitosa: boolean;
}

export async function listarPersonas(page = 1, limit = 10, search = '') {
  const { data } = await api.get<Pagina<Persona>>('/personas', { params: { page, limit, search } });
  return data;
}

export async function eliminarPersona(id: string) {
  const { data } = await api.delete(`/personas/${id}`);
  return data;
}

export async function obtenerPersona(id: string) {
  const { data } = await api.get<Persona>(`/personas/${id}`);
  return data;
}

export async function buscarPersonas(termino: string, captcha_token: string) {
  const { data } = await api.post('/personas/buscar', { termino, captcha_token });
  return data as { resultados: Persona[]; cantidad_resultados: number };
}

export interface FiltrosAuditoria {
  q?: string;
  desde?: string;
  hasta?: string;
}

export async function listarAuditoria(page = 1, limit = 10, filtros: FiltrosAuditoria = {}) {
  const { data } = await api.get<Pagina<RegistroAuditoria>>('/auditoria', { params: { page, limit, ...filtros } });
  return data;
}
