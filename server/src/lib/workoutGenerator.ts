export type ActivityLevel = 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE' | 'VERY_ACTIVE';
export type Goal =
  'LOSE_WEIGHT' | 'GAIN_MUSCLE' | 'MAINTAIN_WEIGHT' | 'HEALTHY_EATING' | 'IMPROVE_STAMINA';
export type DayCategory = 'GYM' | 'HOME' | 'CARDIO' | 'HIIT' | 'YOGA' | 'STRETCHING' | 'REST';
export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export const EXERCISES_PER_DAY = 3;

export function difficultyForActivityLevel(
  activityLevel: ActivityLevel | null | undefined,
): Difficulty {
  switch (activityLevel) {
    case 'MODERATE':
    case 'ACTIVE':
      return 'INTERMEDIATE';
    case 'VERY_ACTIVE':
      return 'ADVANCED';
    case 'SEDENTARY':
    case 'LIGHT':
    default:
      return 'BEGINNER';
  }
}

const GOAL_ROTATIONS: Record<Goal, DayCategory[]> = {
  LOSE_WEIGHT: ['CARDIO', 'HIIT', 'REST', 'CARDIO', 'HIIT', 'YOGA', 'REST'],
  GAIN_MUSCLE: ['GYM', 'GYM', 'REST', 'GYM', 'GYM', 'STRETCHING', 'REST'],
  MAINTAIN_WEIGHT: ['GYM', 'CARDIO', 'REST', 'HOME', 'YOGA', 'HIIT', 'REST'],
  HEALTHY_EATING: ['HOME', 'YOGA', 'REST', 'CARDIO', 'HOME', 'STRETCHING', 'REST'],
  IMPROVE_STAMINA: ['CARDIO', 'HIIT', 'CARDIO', 'REST', 'HIIT', 'CARDIO', 'REST'],
};

const DEFAULT_ROTATION: DayCategory[] = ['GYM', 'CARDIO', 'REST', 'HOME', 'YOGA', 'HIIT', 'REST'];

export function categoryRotationForGoal(goal: Goal | null | undefined): DayCategory[] {
  if (goal && GOAL_ROTATIONS[goal]) return GOAL_ROTATIONS[goal];
  return DEFAULT_ROTATION;
}
