import { useEffect, useRef, useState } from 'react';
import { buscarPersonas, type Persona } from '../api/client';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void }) => string;
      reset?: (id?: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

const SITEKEY = import.meta.env.VITE_TURNSTILE_SITEKEY as string | undefined;

// El token se solicita con el widget explícito UNA vez antes de buscar.
// Nunca se solicita en cada pulsación de tecla.
export default function Buscar() {
  const [termino, setTermino] = useState('');
  const [token, setToken] = useState('');
  const [resultados, setResultados] = useState<Persona[]>([]);
  const [error, setError] = useState('');
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string>('');

  useEffect(() => {
    if (!SITEKEY) return;
    const renderWidget = () => {
      if (widgetRef.current && window.turnstile && !widgetId.current) {
        widgetId.current = window.turnstile.render(widgetRef.current, {
          sitekey: SITEKEY,
          callback: (t: string) => setToken(t),
        });
      }
    };
    if (window.turnstile) {
      renderWidget();
      return;
    }
    window.onTurnstileLoad = renderWidget;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      window.onTurnstileLoad = undefined;
    };
  }, []);

  async function onBuscar() {
    setError('');
    if (termino.trim().length < 3) {
      setError('Ingrese al menos 3 caracteres');
      return;
    }
    if (!token) {
      setError('Complete el captcha antes de buscar');
      return;
    }
    try {
      const res = await buscarPersonas(termino.trim(), token);
      setResultados(res.resultados || []);
      // El token es de un solo uso: se resetea el widget para la próxima búsqueda.
      setToken('');
      window.turnstile?.reset?.(widgetId.current || undefined);
      widgetId.current = '';
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const r = (err as { response?: { status?: number; data?: { error?: string } } }).response;
        setError(r?.data?.error || `Error ${r?.status || ''} en la búsqueda`);
      } else {
        setError('Error de red en la búsqueda');
      }
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Buscar personas</h1>
      <div className="mb-4 flex max-w-lg flex-col gap-3 rounded bg-white p-4 shadow">
        <input
          className="rounded border px-3 py-2"
          placeholder="Nombre, apellido o documento"
          value={termino}
          onChange={(e) => setTermino(e.target.value)}
        />
        {!SITEKEY && <p className="text-sm text-amber-600">Falta VITE_TURNSTILE_SITEKEY en el .env del frontend.</p>}
        <div ref={widgetRef} />
        <button className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50" onClick={() => void onBuscar()} disabled={!token}>
          Buscar
        </button>
        {error && <p className="text-red-600">{error}</p>}
      </div>
      <ul className="flex flex-col gap-2">
        {resultados.map((p) => (
          <li key={p.id} className="rounded bg-white p-3 shadow">
            {p.nombres} {p.apellidos} — {p.nro_documento} {p.edad !== undefined && `(edad: ${p.edad})`}
          </li>
        ))}
      </ul>
    </div>
  );
}
