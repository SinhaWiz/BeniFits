import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { EXPERT_ROLES } from '../types/expert';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-sky-500/20 text-sky-300' : 'text-slate-300 hover:text-white'
  }`;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-y-2 px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">BeniFits</span>
          <div className="flex flex-wrap items-center gap-2">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            {user ? (
              <>
                <NavLink to="/feed" className={navLinkClass}>
                  Feed
                </NavLink>
                <NavLink to="/profile" className={navLinkClass}>
                  Profile
                </NavLink>
                <NavLink to="/progress" className={navLinkClass}>
                  Progress
                </NavLink>
                <NavLink to="/mood" className={navLinkClass}>
                  Mood
                </NavLink>
                <NavLink to="/sleep" className={navLinkClass}>
                  Sleep
                </NavLink>
                <NavLink to="/meditation" className={navLinkClass}>
                  Meditation
                </NavLink>
                <NavLink to="/nutrition" className={navLinkClass}>
                  Nutrition
                </NavLink>
                <NavLink to="/diet-plan" className={navLinkClass}>
                  Diet Plan
                </NavLink>
                <NavLink to="/recipes" className={navLinkClass}>
                  Recipes
                </NavLink>
                <NavLink to="/news" className={navLinkClass}>
                  News
                </NavLink>
                <NavLink to="/research" className={navLinkClass}>
                  Research
                </NavLink>
                <NavLink to="/videos" className={navLinkClass}>
                  Videos
                </NavLink>
                <NavLink to="/workouts" className={navLinkClass}>
                  Workouts
                </NavLink>
                <NavLink to="/ai-nutritionist" className={navLinkClass}>
                  AI Nutritionist
                </NavLink>
                <NavLink to="/ai-weight-loss-coach" className={navLinkClass}>
                  AI Coach
                </NavLink>
                <NavLink to="/experts" className={navLinkClass}>
                  Experts
                </NavLink>
                <NavLink to="/appointments" className={navLinkClass}>
                  Appointments
                </NavLink>
                {EXPERT_ROLES.includes(user.role as (typeof EXPERT_ROLES)[number]) && (
                  <NavLink to="/expert/dashboard" className={navLinkClass}>
                    Expert Dashboard
                  </NavLink>
                )}
                <span className="px-2 text-sm text-slate-400">{user.name ?? user.email}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>
                  Login
                </NavLink>
                <NavLink to="/register" className={navLinkClass}>
                  Register
                </NavLink>
              </>
            )}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <Outlet />
      </main>
    </div>
  );
}
