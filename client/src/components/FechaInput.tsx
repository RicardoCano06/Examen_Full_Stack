import { useEffect, useState } from 'react';
import { isoAFechaES, mascaraFecha, parseFechaES } from '../utils/format';

interface Props {
  label?: string;
  // Valor ISO YYYY-MM-DD (o '' vacío).
  value: string;
  onChange: (iso: string) => void;
  // Aceptado por compatibilidad de API; la obligatoriedad la valida el
  // formulario padre (toast) para mensajes en español consistentes.
  required?: boolean;
}

// Fecha con máscara DD/MM/AAAA (locale del navegador irrelevante).
// Convierte a ISO para el backend; '' si está vacía o incompleta.
export default function FechaInput({ label, value, onChange }: Props) {
  const [texto, setTexto] = useState(() => isoAFechaES(value));
  const [tocado, setTocado] = useState(false);

  // Sincroniza prellenados externos (editar) y limpiezas, sin pisar
  // lo que el usuario está escribiendo.
  useEffect(() => {
    if (value !== (parseFechaES(texto) || '')) setTexto(isoAFechaES(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function escribir(v: string) {
    const m = mascaraFecha(v);
    setTexto(m);
    onChange(parseFechaES(m) || '');
  }

  const invalido = tocado && texto !== '' && !parseFechaES(texto);

  return (
    <label className="block text-sm">
      {label && <span className="mb-1 block font-medium text-slate-700">{label}</span>}
      <input
        value={texto}
        placeholder="DD/MM/AAAA"
        inputMode="numeric"
        onChange={(e) => escribir(e.target.value)}
        onBlur={() => setTocado(true)}
        className={`block h-10 w-full rounded-md border-0 px-3 text-slate-900 shadow-sm ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent sm:text-sm ${
          invalido ? 'ring-red-400' : 'ring-gray-300'
        }`}
      />
      {invalido && <span className="mt-1 block text-xs text-red-600">Fecha inválida (DD/MM/AAAA)</span>}
    </label>
  );
}
