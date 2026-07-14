import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { EXPERT_ROLES } from '../types/expert';
import { Modal } from './ui';
import { NotificationBell } from './NotificationBell';

interface PinnedItem {
  to: string;
  icon: string;
  label: string;
}

const PINNED_ITEMS: PinnedItem[] = [
  { to: '/feed', icon: '📰', label: 'Feed' },
  { to: '/wellness', icon: '🧘', label: 'Wellness' },
  { to: '/nutrition', icon: '🥗', label: 'Nutrition' },
  { to: '/experts', icon: '🩺', label: 'Experts' },
  { to: '/ai-nutritionist', icon: '🤖', label: 'AI Coach' },
];

interface NavGroup {
  title: string;
  links: { to: string; label: string }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Core health',
    links: [
      { to: '/progress', label: 'Progress' },
      { to: '/nutrition', label: 'Nutrition' },
      { to: '/diet-plan', label: 'Diet Plan' },
      { to: '/workouts', label: 'Workouts' },
    ],
  },
  {
    title: 'Wellness',
    links: [
      { to: '/mood', label: 'Mood' },
      { to: '/sleep', label: 'Sleep' },
      { to: '/meditation', label: 'Meditation' },
      { to: '/wellness', label: 'Wellness Dashboard' },
      { to: '/challenges', label: 'Challenges' },
    ],
  },
  {
    title: 'Community',
    links: [{ to: '/feed', label: 'Feed' }],
  },
  {
    title: 'Content',
    links: [
      { to: '/recipes', label: 'Recipes' },
      { to: '/news', label: 'Health News' },
      { to: '/research', label: 'Research' },
      { to: '/videos', label: 'Videos' },
    ],
  },
  {
    title: 'AI',
    links: [
      { to: '/ai-nutritionist', label: 'AI Nutritionist' },
      { to: '/ai-weight-loss-coach', label: 'AI Weight-Loss Coach' },
    ],
  },
  {
    title: 'Marketplace',
    links: [
      { to: '/experts', label: 'Experts' },
      { to: '/appointments', label: 'Appointments' },
    ],
  },
];

const sidebarIconClass = ({ isActive }: { isActive: boolean }) =>
  `flex h-11 w-11 items-center justify-center rounded-2xl text-lg transition-colors ${
    isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
  }`;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isExpert = Boolean(
    user && EXPERT_ROLES.includes(user.role as (typeof EXPERT_ROLES)[number]),
  );

  return (
    <div className="flex min-h-screen gap-6 p-4 sm:p-6">
      <aside className="sticky top-6 flex h-[calc(100vh-3rem)] w-20 flex-col items-center gap-2 rounded-3xl border border-slate-200/70 bg-white py-6 shadow-sm shadow-slate-200/60">
        <Link
          to="/"
          className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white"
        >
          B+
        </Link>

        {user && (
          <nav className="flex flex-1 flex-col items-center gap-2">
            <NavLink to="/" end className={sidebarIconClass} title="Home" aria-label="Home">
              <span aria-hidden="true">🏠</span>
            </NavLink>
            {PINNED_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={sidebarIconClass}
                title={item.label}
                aria-label={item.label}
              >
                <span aria-hidden="true">{item.icon}</span>
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              title="More"
              aria-label="More pages"
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <span aria-hidden="true">⊞</span>
            </button>
          </nav>
        )}

        {!user && <div className="flex-1" />}

        {user && (
          <div className="flex flex-col items-center gap-2">
            <NavLink to="/profile" className={sidebarIconClass} title="Profile" aria-label="Profile">
              <span aria-hidden="true">👤</span>
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
            >
              <span aria-hidden="true">⏻</span>
            </button>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="mb-6 flex items-center justify-end gap-3">
          {user ? (
            <>
              <NotificationBell />
              <div className="flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-4 shadow-sm shadow-slate-200/60">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                  {(user.name ?? user.email).charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-medium text-slate-700">
                  {user.name ?? user.email}
                </span>
              </div>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
              >
                Login
              </NavLink>
              <NavLink
                to="/register"
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              >
                Register
              </NavLink>
            </>
          )}
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>

      {moreOpen && (
        <Modal title="All pages" onClose={() => setMoreOpen(false)}>
          <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
            {NAV_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {group.title}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.links.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMoreOpen(false)}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            {isExpert && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Expert
                </p>
                <Link
                  to="/expert/dashboard"
                  onClick={() => setMoreOpen(false)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  Expert Dashboard
                </Link>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
