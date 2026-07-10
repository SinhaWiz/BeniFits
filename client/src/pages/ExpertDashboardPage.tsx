import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../auth/AuthContext';
import { Card } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';
import {
  createSlotFormSchema,
  type CreateSlotFormValues,
} from '../schemas/availabilitySlot.schema';
import {
  expertProfileFormSchema,
  type ExpertProfileFormValues,
} from '../schemas/expertProfile.schema';
import { EXPERT_ROLES, type AvailabilitySlot, type ExpertProfile } from '../types/expert';

const inputClass =
  'mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none';
const labelClass = 'block text-sm font-medium text-slate-300';

function formatSlotTime(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  return `${start.toLocaleString()} - ${end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

function ProfileEditor() {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ['expertProfile', 'me'],
    queryFn: async () => {
      const res = await apiClient.get<{ profile: ExpertProfile | null }>('/experts/me');
      return res.data.profile;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpertProfileFormValues>({
    resolver: zodResolver(expertProfileFormSchema),
    defaultValues: { isAcceptingBookings: true },
  });

  useEffect(() => {
    if (profileQuery.data) {
      reset({
        specialty: profileQuery.data.specialty,
        focusArea: profileQuery.data.focusArea,
        bio: profileQuery.data.bio,
        credentials: profileQuery.data.credentials ?? undefined,
        yearsExperience: profileQuery.data.yearsExperience ?? undefined,
        isAcceptingBookings: profileQuery.data.isAcceptingBookings,
      });
    }
  }, [profileQuery.data, reset]);

  const saveMutation = useMutation({
    mutationFn: async (values: ExpertProfileFormValues) => {
      const yearsExperience =
        values.yearsExperience === undefined || Number.isNaN(values.yearsExperience)
          ? undefined
          : values.yearsExperience;
      const res = await apiClient.put<{ profile: ExpertProfile }>('/experts/me', {
        ...values,
        yearsExperience,
      });
      return res.data.profile;
    },
    onSuccess: () => {
      setServerError(null);
      queryClient.invalidateQueries({ queryKey: ['expertProfile', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['experts'] });
    },
    onError: (err) => {
      setServerError(getErrorMessage(err, 'Unable to save your profile'));
    },
  });

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-200">Your public profile</h2>
      <form
        onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
        className="mt-4 space-y-4"
        noValidate
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="specialty" className={labelClass}>
              Specialty
            </label>
            <input id="specialty" className={inputClass} {...register('specialty')} />
            {errors.specialty && (
              <p className="mt-1 text-sm text-rose-400">{errors.specialty.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="focusArea" className={labelClass}>
              Focus area
            </label>
            <input id="focusArea" className={inputClass} {...register('focusArea')} />
            {errors.focusArea && (
              <p className="mt-1 text-sm text-rose-400">{errors.focusArea.message}</p>
            )}
          </div>
        </div>
        <div>
          <label htmlFor="bio" className={labelClass}>
            Bio
          </label>
          <textarea id="bio" rows={4} className={inputClass} {...register('bio')} />
          {errors.bio && <p className="mt-1 text-sm text-rose-400">{errors.bio.message}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="credentials" className={labelClass}>
              Credentials
            </label>
            <input id="credentials" className={inputClass} {...register('credentials')} />
          </div>
          <div>
            <label htmlFor="yearsExperience" className={labelClass}>
              Years of experience
            </label>
            <input
              id="yearsExperience"
              type="number"
              min={0}
              max={80}
              className={inputClass}
              {...register('yearsExperience', { valueAsNumber: true })}
            />
            {errors.yearsExperience && (
              <p className="mt-1 text-sm text-rose-400">{errors.yearsExperience.message}</p>
            )}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" {...register('isAcceptingBookings')} />
          Currently accepting bookings
        </label>
        {serverError && <p className="text-sm text-rose-400">{serverError}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : 'Save profile'}
        </button>
      </form>
    </Card>
  );
}

function SlotManager() {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const slotsQuery = useQuery({
    queryKey: ['expertProfile', 'me', 'slots'],
    queryFn: async () => {
      const res = await apiClient.get<{ slots: AvailabilitySlot[] }>('/experts/me/slots');
      return res.data.slots;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSlotFormValues>({ resolver: zodResolver(createSlotFormSchema) });

  const createMutation = useMutation({
    mutationFn: async (values: CreateSlotFormValues) => {
      const res = await apiClient.post<{ slot: AvailabilitySlot }>('/experts/me/slots', {
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: new Date(values.endsAt).toISOString(),
      });
      return res.data.slot;
    },
    onSuccess: () => {
      setServerError(null);
      reset();
      queryClient.invalidateQueries({ queryKey: ['expertProfile', 'me', 'slots'] });
    },
    onError: (err) => {
      setServerError(getErrorMessage(err, 'Unable to create slot'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/experts/me/slots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expertProfile', 'me', 'slots'] });
    },
  });

  const slots = slotsQuery.data ?? [];

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-200">Availability slots</h2>
      <form
        onSubmit={handleSubmit((values) => createMutation.mutate(values))}
        className="mt-4 grid gap-4 sm:grid-cols-3"
        noValidate
      >
        <div>
          <label htmlFor="startsAt" className={labelClass}>
            Start
          </label>
          <input
            id="startsAt"
            type="datetime-local"
            className={inputClass}
            {...register('startsAt')}
          />
          {errors.startsAt && (
            <p className="mt-1 text-sm text-rose-400">{errors.startsAt.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="endsAt" className={labelClass}>
            End
          </label>
          <input
            id="endsAt"
            type="datetime-local"
            className={inputClass}
            {...register('endsAt')}
          />
          {errors.endsAt && <p className="mt-1 text-sm text-rose-400">{errors.endsAt.message}</p>}
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:opacity-60"
          >
            Add slot
          </button>
        </div>
      </form>
      {serverError && <p className="mt-2 text-sm text-rose-400">{serverError}</p>}

      {slotsQuery.isLoading ? (
        <p className="mt-4 text-sm text-slate-300">Loading...</p>
      ) : slots.length === 0 ? (
        <p className="mt-4 text-sm text-slate-300">No slots yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {slots.map((slot) => (
            <li
              key={slot.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/40 p-4 text-sm"
            >
              <span className="text-slate-200">{formatSlotTime(slot.startsAt, slot.endsAt)}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">{slot.status}</span>
                {slot.status === 'OPEN' && (
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(slot.id)}
                    className="text-sm text-rose-400 hover:text-rose-300"
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function ExpertDashboardPage() {
  const { user } = useAuth();

  if (!user || !EXPERT_ROLES.includes(user.role as (typeof EXPERT_ROLES)[number])) {
    return (
      <Card>
        <p className="text-slate-300">
          This page is only available to registered experts (nutritionists, doctors, and coaches).
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Expert dashboard</h1>
      <ProfileEditor />
      <SlotManager />
    </div>
  );
}
