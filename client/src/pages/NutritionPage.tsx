import { useQuery } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';
import type { NutritionSummary } from '../types/nutrition';

const inputClass =
  'mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none';

function MacroStat({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 text-center">
      <p className="text-xs tracking-wide text-slate-400 uppercase">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-100">
        {value != null ? `${value}${unit}` : '—'}
      </p>
    </div>
  );
}

export default function NutritionPage() {
  const [inputValue, setInputValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFdcId, setSelectedFdcId] = useState<number | null>(null);

  const searchQuery = useQuery({
    queryKey: ['nutrition', 'search', searchTerm],
    queryFn: async () => {
      const res = await apiClient.get<{ results: NutritionSummary[] }>('/nutrition/search', {
        params: { q: searchTerm },
      });
      return res.data.results;
    },
    enabled: searchTerm.length > 0,
  });

  const detailQuery = useQuery({
    queryKey: ['nutrition', 'food', selectedFdcId],
    queryFn: async () => {
      const res = await apiClient.get<{ food: NutritionSummary }>(
        `/nutrition/foods/${selectedFdcId}`,
      );
      return res.data.food;
    },
    enabled: selectedFdcId != null,
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSelectedFdcId(null);
    setSearchTerm(inputValue.trim());
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-black/40 backdrop-blur">
        <h1 className="text-2xl font-bold">Nutrition calculator</h1>
        <p className="mt-2 text-slate-300">
          Search USDA FoodData Central for calories and macros per food item.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex gap-3">
          <input
            type="text"
            placeholder="Search a food, e.g. banana"
            className={inputClass}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="shrink-0 rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:opacity-60"
          >
            Search
          </button>
        </form>

        {searchQuery.isError && (
          <p className="mt-4 text-sm text-rose-400">
            {getErrorMessage(searchQuery.error, 'Unable to search foods')}
          </p>
        )}
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/40 backdrop-blur">
          <h2 className="text-lg font-semibold text-slate-200">Results</h2>
          {searchQuery.isLoading && <p className="mt-4 text-slate-300">Searching...</p>}
          {!searchQuery.isLoading && searchTerm && (searchQuery.data ?? []).length === 0 && (
            <p className="mt-4 text-slate-300">No results.</p>
          )}
          <ul className="mt-4 space-y-2">
            {(searchQuery.data ?? []).map((food) => (
              <li key={food.fdcId}>
                <button
                  type="button"
                  onClick={() => setSelectedFdcId(food.fdcId)}
                  className={`w-full rounded-lg border px-4 py-2 text-left text-sm transition-colors ${
                    selectedFdcId === food.fdcId
                      ? 'border-sky-400 bg-sky-500/10 text-sky-300'
                      : 'border-white/10 bg-slate-950/40 text-slate-200 hover:border-white/20'
                  }`}
                >
                  <span className="font-medium">{food.description}</span>
                  <span className="ml-2 text-xs text-slate-400">{food.dataType}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/40 backdrop-blur">
          <h2 className="text-lg font-semibold text-slate-200">Nutrition facts</h2>
          {!selectedFdcId && <p className="mt-4 text-slate-300">Select a food to see details.</p>}
          {detailQuery.isLoading && <p className="mt-4 text-slate-300">Loading...</p>}
          {detailQuery.data && (
            <div className="mt-4">
              <p className="font-medium text-slate-100">{detailQuery.data.description}</p>
              <p className="text-xs text-slate-400">{detailQuery.data.dataType}</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <MacroStat label="Calories" value={detailQuery.data.calories} unit=" kcal" />
                <MacroStat label="Protein" value={detailQuery.data.proteinG} unit="g" />
                <MacroStat label="Fat" value={detailQuery.data.fatG} unit="g" />
                <MacroStat label="Carbs" value={detailQuery.data.carbsG} unit="g" />
                <MacroStat label="Fiber" value={detailQuery.data.fiberG} unit="g" />
                <MacroStat label="Sugar" value={detailQuery.data.sugarG} unit="g" />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
