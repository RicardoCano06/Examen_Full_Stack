type Tone = 'green' | 'red' | 'amber';

const DOTS: Record<Tone, string> = {
  green: 'bg-green-500',
  red: 'bg-red-500',
  amber: 'bg-amber-500',
};

export default function StatusDot({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-700">
      <span className={`inline-block h-2 w-2 rounded-full ${DOTS[tone]}`} aria-hidden="true" />
      {children}
    </span>
  );
}
