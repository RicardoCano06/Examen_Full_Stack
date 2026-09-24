import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { buscarPersonas, type Persona } from '../api/client';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Input from '../components/Input';
import PageHeader from '../components/PageHeader';
import { useToast } from '../components/Toast';

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
  const toast = useToast();
  const [termino, setTermino] = useState('');
  const [token, setToken] = useState('');
  const [resultados, setResultados] = useState<Persona[]>([]);
  const [buscado, setBuscado] = useState(false);
  const [searching, setSearching] = useState(false);
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
    if (termino.trim().length < 3) {
      toast('error', 'Ingrese al menos 3 caracteres');
      return;
    }
    if (!token) {
      toast('error', 'Complete el captcha antes de buscar');
      return;
    }
    setSearching(true);
    try {
      const res = await buscarPersonas(termino.trim(), token);
      setResultados(res.resultados || []);
      setBuscado(true);
      // El token es de un solo uso: se resetea el widget para la próxima búsqueda.
      setToken('');
      window.turnstile?.reset?.(widgetId.current || undefined);
      widgetId.current = '';
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const r = (err as { response?: { status?: number; data?: { error?: string } } }).response;
        toast('error', r?.data?.error || `Error ${r?.status || ''} en la búsqueda`);
      } else {
        toast('error', 'Error de red en la búsqueda');
      }
    } finally {
      setSearching(false);
    }
  }

  return (
    <div>
      <PageHeader title="Buscar personas" description="Verificación anti-automatización obligatoria antes de cada búsqueda" />
      <Card className="mx-auto flex max-w-2xl flex-col gap-4 p-8">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void onBuscar();
          }}
        >
          <Input
            label="Nombre, apellido o documento"
            value={termino}
            onChange={(e) => setTermino(e.target.value)}
          />
          {!SITEKEY && <p className="text-sm text-amber-600">Falta VITE_TURNSTILE_SITEKEY en el .env del frontend.</p>}
          <div ref={widgetRef} />
          <Button type="submit" disabled={!token} loading={searching}>
            Buscar
          </Button>
        </form>
      </Card>
      {buscado && (
        <div className="mx-auto mt-4 flex max-w-2xl flex-col gap-2">
          {resultados.length === 0 ? (
            <EmptyState message="Sin resultados para ese término." />
          ) : (
            resultados.map((p) => (
              <Link key={p.id} to={`/personas/${p.id}`} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-blue-300">
                <Avatar nombres={p.nombres} apellidos={p.apellidos} />
                <span className="flex-1">
                  <span className="block text-sm font-medium text-slate-900">{p.nombres} {p.apellidos}</span>
                  <span className="block font-mono text-xs text-slate-500">{p.nro_documento}</span>
                </span>
                <span className="text-xs text-slate-500">{p.edad !== undefined ? `${p.edad} años` : '—'}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
