import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../auth/AuthContext';

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <p className="text-center text-slate-300">Loading...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
