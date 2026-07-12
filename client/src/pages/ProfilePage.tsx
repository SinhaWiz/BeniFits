import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';
import {
  ACTIVITY_LEVELS,
  GOALS,
  type HealthProfile,
  type HealthProfileUpdate,
} from '../types/profile';

interface ProfileFormValues {
  age: string;
  heightCm: string;
  weightKg: string;
  bloodGroup: string;
  activityLevel: string;
  goal: string;
  sleepHours: string;
  sleepGoalHours: string;
  waterIntakeMl: string;
  diseases: string;
  allergies: string;
  foodPreferences: string;
}

const emptyFormValues: ProfileFormValues = {
  age: '',
  heightCm: '',
  weightKg: '',
  bloodGroup: '',
  activityLevel: '',
  goal: '',
  sleepHours: '',
  sleepGoalHours: '',
  waterIntakeMl: '',
  diseases: '',
  allergies: '',
  foodPreferences: '',
};

function profileToFormValues(profile: HealthProfile | null): ProfileFormValues {
  if (!profile) return emptyFormValues;
  return {
    age: profile.age?.toString() ?? '',
    heightCm: profile.heightCm?.toString() ?? '',
    weightKg: profile.weightKg?.toString() ?? '',
    bloodGroup: profile.bloodGroup ?? '',
    activityLevel: profile.activityLevel ?? '',
    goal: profile.goal ?? '',
    sleepHours: profile.sleepHours?.toString() ?? '',
    sleepGoalHours: profile.sleepGoalHours?.toString() ?? '',
    waterIntakeMl: profile.waterIntakeMl?.toString() ?? '',
    diseases: profile.diseases.join(', '),
    allergies: profile.allergies.join(', '),
    foodPreferences: profile.foodPreferences.join(', '),
  };
}

function toOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : Number(trimmed);
}

function toArray(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formValuesToPayload(values: ProfileFormValues): HealthProfileUpdate {
  return {
    age: toOptionalNumber(values.age),
    heightCm: toOptionalNumber(values.heightCm),
    weightKg: toOptionalNumber(values.weightKg),
    bloodGroup: values.bloodGroup.trim() || undefined,
    activityLevel: (values.activityLevel || undefined) as HealthProfileUpdate['activityLevel'],
    goal: (values.goal || undefined) as HealthProfileUpdate['goal'],
    sleepHours: toOptionalNumber(values.sleepHours),
    sleepGoalHours: toOptionalNumber(values.sleepGoalHours),
    waterIntakeMl: toOptionalNumber(values.waterIntakeMl),
    diseases: toArray(values.diseases),
    allergies: toArray(values.allergies),
    foodPreferences: toArray(values.foodPreferences),
  };
}

const inputClass =
  'mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none';
const labelClass = 'block text-sm font-medium text-slate-300';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await apiClient.get<{ profile: HealthProfile | null }>('/profile');
      return res.data.profile;
    },
  });

  const { register, handleSubmit, reset } = useForm<ProfileFormValues>({
    defaultValues: emptyFormValues,
  });

  useEffect(() => {
    if (profileQuery.data !== undefined) {
      reset(profileToFormValues(profileQuery.data));
    }
  }, [profileQuery.data, reset]);

  const mutation = useMutation({
    mutationFn: async (payload: HealthProfileUpdate) => {
      const res = await apiClient.put<{ profile: HealthProfile }>('/profile', payload);
      return res.data.profile;
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(['profile'], profile);
      setServerError(null);
      setSavedAt(Date.now());
    },
    onError: (err) => {
      setServerError(getErrorMessage(err, 'Unable to save your health profile'));
    },
  });

  const onSubmit = (values: ProfileFormValues) => {
    setSavedAt(null);
    mutation.mutate(formValuesToPayload(values));
  };

  if (profileQuery.isLoading) {
    return <p className="text-center text-slate-300">Loading your health profile...</p>;
  }

  return (
    <section className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-black/40 backdrop-blur">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Health profile</h1>
        {profileQuery.data?.bmi != null && (
          <span className="text-sm text-slate-300">
            BMI: <span className="font-semibold text-sky-300">{profileQuery.data.bmi}</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6" noValidate>
        <fieldset className="grid grid-cols-2 gap-4">
          <legend className="col-span-2 mb-1 text-sm font-semibold text-slate-200">
            Personal information
          </legend>
          <div>
            <label htmlFor="age" className={labelClass}>
              Age
            </label>
            <input id="age" type="number" min={0} className={inputClass} {...register('age')} />
          </div>
          <div>
            <label htmlFor="bloodGroup" className={labelClass}>
              Blood group
            </label>
            <input id="bloodGroup" type="text" className={inputClass} {...register('bloodGroup')} />
          </div>
          <div>
            <label htmlFor="heightCm" className={labelClass}>
              Height (cm)
            </label>
            <input
              id="heightCm"
              type="number"
              min={0}
              className={inputClass}
              {...register('heightCm')}
            />
          </div>
          <div>
            <label htmlFor="weightKg" className={labelClass}>
              Weight (kg)
            </label>
            <input
              id="weightKg"
              type="number"
              min={0}
              className={inputClass}
              {...register('weightKg')}
            />
          </div>
        </fieldset>

        <fieldset className="grid grid-cols-2 gap-4">
          <legend className="col-span-2 mb-1 text-sm font-semibold text-slate-200">
            Lifestyle &amp; goals
          </legend>
          <div>
            <label htmlFor="activityLevel" className={labelClass}>
              Activity level
            </label>
            <select id="activityLevel" className={inputClass} {...register('activityLevel')}>
              <option value="">Not set</option>
              {ACTIVITY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="goal" className={labelClass}>
              Goal
            </label>
            <select id="goal" className={inputClass} {...register('goal')}>
              <option value="">Not set</option>
              {GOALS.map((goal) => (
                <option key={goal} value={goal}>
                  {goal.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sleepHours" className={labelClass}>
              Sleep (hours/night)
            </label>
            <input
              id="sleepHours"
              type="number"
              min={0}
              step="0.5"
              className={inputClass}
              {...register('sleepHours')}
            />
          </div>
          <div>
            <label htmlFor="waterIntakeMl" className={labelClass}>
              Water intake (ml/day)
            </label>
            <input
              id="waterIntakeMl"
              type="number"
              min={0}
              className={inputClass}
              {...register('waterIntakeMl')}
            />
          </div>
          <div>
            <label htmlFor="sleepGoalHours" className={labelClass}>
              Sleep goal (hours/night)
            </label>
            <input
              id="sleepGoalHours"
              type="number"
              min={0}
              step="0.5"
              className={inputClass}
              {...register('sleepGoalHours')}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-1 text-sm font-semibold text-slate-200">
            Medical &amp; preferences
          </legend>
          <div>
            <label htmlFor="diseases" className={labelClass}>
              Diseases (comma-separated)
            </label>
            <input id="diseases" type="text" className={inputClass} {...register('diseases')} />
          </div>
          <div>
            <label htmlFor="allergies" className={labelClass}>
              Allergies (comma-separated)
            </label>
            <input id="allergies" type="text" className={inputClass} {...register('allergies')} />
          </div>
          <div>
            <label htmlFor="foodPreferences" className={labelClass}>
              Food preferences (comma-separated)
            </label>
            <input
              id="foodPreferences"
              type="text"
              className={inputClass}
              {...register('foodPreferences')}
            />
          </div>
        </fieldset>

        {serverError && <p className="text-sm text-rose-400">{serverError}</p>}
        {savedAt && !mutation.isPending && (
          <p className="text-sm text-emerald-400">Profile saved.</p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:opacity-60"
        >
          {mutation.isPending ? 'Saving...' : 'Save profile'}
        </button>
      </form>
    </section>
  );
}
