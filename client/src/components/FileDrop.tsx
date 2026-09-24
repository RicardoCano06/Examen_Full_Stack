import { useEffect, useRef, useState } from 'react';

interface Props {
  label: string;
  hint?: string;
  accept?: string;
  file: File | null;
  onChange: (f: File | null) => void;
  required?: boolean;
}

export default function FileDrop({ label, hint, accept = 'image/jpeg,image/png,image/webp', file, onChange, required = false }: Props) {
  const [arrastrando, setArrastrando] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function soltar(e: React.DragEvent) {
    e.preventDefault();
    setArrastrando(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onChange(f);
  }

  return (
    <div>
      <p className="mb-1 block text-sm font-medium text-slate-700">{label}</p>
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={soltar}
        className={`flex cursor-pointer items-center gap-4 rounded-xl p-4 shadow-sm ring-1 transition-colors ${
          arrastrando ? 'bg-blue-50/50 ring-2 ring-blue-400' : 'bg-white ring-slate-900/5 hover:ring-slate-300'
        }`}
      >
        {preview ? (
          <img src={preview} alt={`Vista previa de ${label}`} className="aspect-[85.6/54] w-32 shrink-0 rounded-lg object-cover ring-1 ring-slate-900/10" />
        ) : (
          <span className="inline-flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400" aria-hidden="true">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.5-3.5a2 2 0 0 0-3 0L6 20" />
            </svg>
          </span>
        )}
        <span className="text-sm">
          <span className="block font-medium text-slate-700">
            {file ? file.name : 'Arrastre la imagen aquí o haga clic para elegirla'}
          </span>
          <span className="block text-slate-500">{hint || 'JPEG, PNG o WEBP · máx. 5 MB'}</span>
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          required={required && !file}
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
      </div>
    </div>
  );
}
