import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

const variantClass: Record<Variant, string> = {
  primary: 'rounded-full bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-500',
  secondary:
    'rounded-full border border-slate-200 bg-white px-5 py-2.5 font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900',
  danger: 'text-sm font-medium text-rose-600 hover:text-rose-500',
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
