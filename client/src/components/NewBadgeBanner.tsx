import type { WellnessBadge } from '../types/gamification';

interface NewBadgeBannerProps {
  badges: Pick<WellnessBadge, 'key' | 'name' | 'icon'>[];
}

export function NewBadgeBanner({ badges }: NewBadgeBannerProps) {
  if (badges.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
      {badges.map((badge) => (
        <p key={badge.key}>
          <span aria-hidden="true">{badge.icon}</span> New badge earned:{' '}
          <span className="font-semibold">{badge.name}</span>
        </p>
      ))}
    </div>
  );
}
