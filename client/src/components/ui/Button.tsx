import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

const variantClass: Record<Variant, string> = {
  primary: 'rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-950 hover:bg-sky-400',
  secondary:
    'rounded-lg border border-white/10 px-4 py-2 font-medium text-slate-300 hover:border-white/20 hover:text-white',
  danger: 'text-sm font-medium text-rose-400 hover:text-rose-300',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`transition-colors disabled:opacity-60 ${variantClass[variant]} ${className}`}
      {...props}
    />
  );
}
