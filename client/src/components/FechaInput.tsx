import { useEffect, useRef, useState } from 'react';
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
  const pickerRef = useRef<HTMLInputElement>(null);

  return (
    <label className="block text-sm">
      {label && <span className="mb-1 block font-medium text-slate-700">{label}</span>}
      <div className="relative">
        <input
          value={texto}
          placeholder="DD/MM/AAAA"
          inputMode="numeric"
          onChange={(e) => escribir(e.target.value)}
          onBlur={() => setTocado(true)}
          className={`block h-10 w-full rounded-md border-0 px-3 pr-10 text-slate-900 shadow-sm ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent sm:text-sm ${
            invalido ? 'ring-red-400' : 'ring-gray-300'
          }`}
        />
        <button
          type="button"
          onClick={() => pickerRef.current?.showPicker()}
          aria-label="Elegir fecha del calendario"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </button>
        <input
          ref={pickerRef}
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
      </div>
      {invalido && <span className="mt-1 block text-xs text-red-600">Fecha inválida (DD/MM/AAAA)</span>}
    </label>
  );
}
