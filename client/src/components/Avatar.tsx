export function iniciales(nombres: string, apellidos: string): string {
  const n = nombres.trim().charAt(0);
  const a = apellidos.trim().charAt(0);
  return `${n}${a}`.toUpperCase() || '–';
}

export default function Avatar({ nombres, apellidos }: { nombres: string; apellidos: string }) {
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700" aria-hidden="true">
      {iniciales(nombres, apellidos)}
    </span>
  );
}
