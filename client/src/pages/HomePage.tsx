import { useEffect, useState } from 'react';

export default function HomePage() {
  const [message, setMessage] = useState('Loading health status...');

  useEffect(() => {
    let active = true;

    async function loadHealth() {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        if (active) {
          setMessage(data.message);
        }
      } catch {
        if (active) {
          setMessage('API server is not responding yet.');
        }
      }
    }

    loadHealth();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="w-full rounded-3xl border border-white/10 bg-slate-900/70 p-12 shadow-2xl shadow-black/40 backdrop-blur">
      <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-sky-300 uppercase">BeniFits</p>
      <h1 className="text-5xl leading-tight font-bold text-balance sm:text-6xl">
        Your complete health &amp; wellness platform
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-300">{message}</p>
    </section>
  );
}
