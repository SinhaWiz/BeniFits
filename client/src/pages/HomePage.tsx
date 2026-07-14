import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Card } from '../components/ui';

const FEATURE_HIGHLIGHTS = [
  {
    to: '/wellness',
    icon: '🧘',
    title: 'Wellness',
    description: 'Track mood, sleep, and meditation. Build streaks and earn badges.',
  },
  {
    to: '/nutrition',
    icon: '🥗',
    title: 'Nutrition',
    description: 'Search foods, build diet plans, and browse recipes.',
  },
  {
    to: '/ai-nutritionist',
    icon: '🤖',
    title: 'AI Coach',
    description: 'Chat with an AI nutritionist and get a personalized weight-loss plan.',
  },
  {
    to: '/experts',
    icon: '🩺',
    title: 'Experts',
    description: 'Book a session with a nutritionist, doctor, or coach.',
  },
  {
    to: '/feed',
    icon: '📰',
    title: 'Community',
    description: 'Share progress, follow others, and join the conversation.',
  },
  {
    to: '/challenges',
    icon: '🏆',
    title: 'Challenges',
    description: 'Join a challenge and climb the leaderboard.',
  },
];

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
    <div className="space-y-8">
      <Card className="p-12">
        <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-blue-600 uppercase">
          BeniFits
        </p>
        <h1 className="text-5xl leading-tight font-bold text-balance text-slate-900 sm:text-6xl">
          Your complete health &amp; wellness platform
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-500">{message}</p>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Explore</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_HIGHLIGHTS.map((feature) => (
            <Link key={feature.to} to={feature.to}>
              <Card className="h-full p-6 transition-shadow hover:shadow-md hover:shadow-slate-200">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-xl">
                  <span aria-hidden="true">{feature.icon}</span>
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{feature.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
