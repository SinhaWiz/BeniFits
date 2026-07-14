import type { HTMLAttributes } from 'react';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-200/60 sm:p-8 ${className}`}
      {...props}
    />
  );
}
