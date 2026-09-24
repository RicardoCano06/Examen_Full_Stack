import type { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const INPUT_CLASS =
  'block h-10 w-full rounded-md border-0 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent sm:text-sm';

export default function Input({ label, error, id, className = '', ...rest }: Props) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <label className="block text-sm" htmlFor={inputId}>
      {label && <span className="mb-1 block font-medium text-gray-700">{label}</span>}
      <input
        id={inputId}
        className={`${INPUT_CLASS} ${error ? 'ring-red-400' : ''} ${className}`}
        {...rest}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
