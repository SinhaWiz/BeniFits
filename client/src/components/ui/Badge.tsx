import type { HTMLAttributes } from 'react';

export function Badge({ className = '', ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ${className}`}
      {...props}
    />
  );
}
