import { useQuery } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { Link } from 'react-router';
import { Button, Card } from '../components/ui';
import { apiClient } from '../lib/apiClient';
import { getErrorMessage } from '../lib/errorMessage';
import type { RecipeSummary } from '../types/recipe';

const inputClass =
  'mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 focus:border-sky-400 focus:outline-none';

export default function RecipesPage() {
  const [inputValue, setInputValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const searchQuery = useQuery({
    queryKey: ['recipes', 'search', searchTerm],
    queryFn: async () => {
      const res = await apiClient.get<{ results: RecipeSummary[] }>('/recipes/search', {
        params: { q: searchTerm },
      });
      return res.data.results;
    },
    enabled: searchTerm.length > 0,
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSearchTerm(inputValue.trim());
  };

  const results = searchQuery.data ?? [];

  return (
    <div className="space-y-8">
      <Card>
        <h1 className="text-2xl font-bold">Recipes</h1>
        <p className="mt-2 text-slate-300">
          Search for recipes and add them straight to a diet plan.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex gap-3">
          <input
            type="text"
            placeholder="Search a recipe, e.g. chicken stir fry"
            className={inputClass}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <Button type="submit" disabled={!inputValue.trim()} className="shrink-0">
            Search
          </Button>
        </form>

        {searchQuery.isError && (
          <p className="mt-4 text-sm text-rose-400">
            {getErrorMessage(searchQuery.error, 'Unable to search recipes')}
          </p>
        )}
      </Card>

      {searchQuery.isLoading ? (
        <p className="text-slate-300">Searching...</p>
      ) : searchTerm && results.length === 0 ? (
        <p className="text-slate-300">No recipes found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((recipe) => (
            <Link key={recipe.id} to={`/recipes/${recipe.id}`}>
              <Card className="h-full transition-colors hover:border-white/20">
                {recipe.image && (
                  <img
                    src={recipe.image}
                    alt={recipe.title}
                    className="mb-3 aspect-video w-full rounded-xl object-cover"
                  />
                )}
                <h2 className="font-medium text-slate-100">{recipe.title}</h2>
                <p className="mt-1 text-xs text-slate-400">
                  {recipe.readyInMinutes != null && `${recipe.readyInMinutes} min`}
                  {recipe.readyInMinutes != null && recipe.servings != null && ' · '}
                  {recipe.servings != null && `${recipe.servings} servings`}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
