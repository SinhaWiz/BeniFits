import { useEffect, useState } from 'react';

export default function App() {
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
    <main className="app-shell">
      <section className="hero-card">
        <p className="eyebrow">BeniHealth</p>
        <h1>Fullstack React starter</h1>
        <p className="subtitle">{message}</p>
      </section>
    </main>
  );
}
