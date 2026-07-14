import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-300/40">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-700"
          >
            &times;
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
