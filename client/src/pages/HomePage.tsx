import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui';

// three.js is a large, decorative dependency — only load it for this page.
const HeroBackground = lazy(() =>
  import('../components/HeroBackground').then((module) => ({ default: module.HeroBackground })),
);

const PILLARS = [
  {
    icon: '🧘',
    title: 'Track your health',
    description: 'Mood, sleep, meditation, nutrition, and workouts, all in one place.',
  },
  {
    icon: '🤖',
    title: 'AI-powered coaching',
    description: 'A nutritionist chat and a weight-loss coach, available whenever you need them.',
  },
  {
    icon: '🩺',
    title: 'Experts & community',
    description: 'Book real experts, join challenges, and share progress with others.',
  },
];

export default function HomePage() {
  const { user } = useAuth();
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
    <div className="relative">
      <Suspense fallback={null}>
        <HeroBackground />
      </Suspense>

      <section className="relative z-10 flex min-h-[75vh] flex-col justify-center px-2 py-16 sm:px-4">
        <p className="mb-4 text-sm font-semibold tracking-[0.2em] text-blue-600 uppercase">
          BeniFits
        </p>
        <h1 className="max-w-3xl text-6xl leading-[1.05] font-bold text-balance text-slate-900 sm:text-7xl lg:text-8xl">
          Your complete health &amp; wellness platform
        </h1>
        <p className="mt-6 max-w-xl text-xl text-slate-500">{message}</p>

        {!user && (
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link to="/register">
              <Button variant="primary" className="text-base">
                Get started
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" className="text-base">
                Sign in
              </Button>
            </Link>
          </div>
        )}
      </section>

      <section className="relative z-10 grid grid-cols-1 gap-x-8 gap-y-10 border-t border-slate-200/70 py-14 sm:grid-cols-3">
        {PILLARS.map((pillar) => (
          <div key={pillar.title}>
            <span className="text-2xl" aria-hidden="true">
              {pillar.icon}
            </span>
            <h2 className="mt-3 font-semibold text-slate-900">{pillar.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{pillar.description}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
