import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { getErrorMessage } from '../lib/errorMessage';
import { loginSchema, type LoginFormValues } from '../schemas/auth.schema';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      await login(values.email, values.password);
      navigate('/profile');
    } catch (err) {
      setServerError(getErrorMessage(err, 'Unable to log in'));
    }
  };

  return (
    <section className="mx-auto max-w-md rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-black/40 backdrop-blur">
      <h1 className="text-2xl font-bold">Log in</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none"
            {...register('email')}
          />
          {errors.email && <p className="mt-1 text-sm text-rose-400">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-300">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none"
            {...register('password')}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-rose-400">{errors.password.message}</p>
          )}
        </div>
        {serverError && <p className="text-sm text-rose-400">{serverError}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:opacity-60"
        >
          {isSubmitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    </section>
  );
}
