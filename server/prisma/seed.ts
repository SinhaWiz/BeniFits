import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type Category = 'GYM' | 'HOME' | 'CARDIO' | 'HIIT' | 'YOGA' | 'STRETCHING';
type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

interface ExerciseSeed {
  name: string;
  category: Category;
  difficulty: Difficulty;
  muscleGroup?: string;
  defaultSets?: number;
  defaultReps?: number;
  durationMinutes?: number;
  description?: string;
}

const exercises: ExerciseSeed[] = [
  // GYM
  {
    name: 'Bodyweight Squats',
    category: 'GYM',
    difficulty: 'BEGINNER',
    muscleGroup: 'legs',
    defaultSets: 3,
    defaultReps: 12,
  },
  {
    name: 'Dumbbell Rows',
    category: 'GYM',
    difficulty: 'BEGINNER',
    muscleGroup: 'back',
    defaultSets: 3,
    defaultReps: 10,
  },
  {
    name: 'Barbell Bench Press',
    category: 'GYM',
    difficulty: 'INTERMEDIATE',
    muscleGroup: 'chest',
    defaultSets: 4,
    defaultReps: 8,
  },
  {
    name: 'Lat Pulldown',
    category: 'GYM',
    difficulty: 'INTERMEDIATE',
    muscleGroup: 'back',
    defaultSets: 4,
    defaultReps: 10,
  },
  {
    name: 'Barbell Deadlift',
    category: 'GYM',
    difficulty: 'ADVANCED',
    muscleGroup: 'full body',
    defaultSets: 5,
    defaultReps: 5,
  },
  {
    name: 'Weighted Pull-ups',
    category: 'GYM',
    difficulty: 'ADVANCED',
    muscleGroup: 'back',
    defaultSets: 4,
    defaultReps: 6,
  },

  // HOME
  {
    name: 'Push-ups',
    category: 'HOME',
    difficulty: 'BEGINNER',
    muscleGroup: 'chest',
    defaultSets: 3,
    defaultReps: 10,
  },
  {
    name: 'Bodyweight Lunges',
    category: 'HOME',
    difficulty: 'BEGINNER',
    muscleGroup: 'legs',
    defaultSets: 3,
    defaultReps: 12,
  },
  {
    name: 'Pike Push-ups',
    category: 'HOME',
    difficulty: 'INTERMEDIATE',
    muscleGroup: 'shoulders',
    defaultSets: 3,
    defaultReps: 10,
  },
  {
    name: 'Bulgarian Split Squats',
    category: 'HOME',
    difficulty: 'INTERMEDIATE',
    muscleGroup: 'legs',
    defaultSets: 3,
    defaultReps: 10,
  },
  {
    name: 'Pistol Squats',
    category: 'HOME',
    difficulty: 'ADVANCED',
    muscleGroup: 'legs',
    defaultSets: 3,
    defaultReps: 6,
  },
  {
    name: 'Archer Push-ups',
    category: 'HOME',
    difficulty: 'ADVANCED',
    muscleGroup: 'chest',
    defaultSets: 3,
    defaultReps: 8,
  },

  // CARDIO
  { name: 'Brisk Walking', category: 'CARDIO', difficulty: 'BEGINNER', durationMinutes: 20 },
  { name: 'Stationary Cycling', category: 'CARDIO', difficulty: 'BEGINNER', durationMinutes: 20 },
  { name: 'Jogging', category: 'CARDIO', difficulty: 'INTERMEDIATE', durationMinutes: 30 },
  { name: 'Jump Rope', category: 'CARDIO', difficulty: 'INTERMEDIATE', durationMinutes: 15 },
  { name: 'Sprint Intervals', category: 'CARDIO', difficulty: 'ADVANCED', durationMinutes: 25 },
  { name: 'Stair Climbing', category: 'CARDIO', difficulty: 'ADVANCED', durationMinutes: 30 },

  // HIIT
  {
    name: 'HIIT Circuit - Beginner',
    category: 'HIIT',
    difficulty: 'BEGINNER',
    durationMinutes: 15,
  },
  { name: 'Bodyweight HIIT Basics', category: 'HIIT', difficulty: 'BEGINNER', durationMinutes: 12 },
  { name: 'Tabata Burpees', category: 'HIIT', difficulty: 'INTERMEDIATE', durationMinutes: 20 },
  { name: 'Kettlebell HIIT', category: 'HIIT', difficulty: 'INTERMEDIATE', durationMinutes: 20 },
  { name: 'Advanced HIIT Circuit', category: 'HIIT', difficulty: 'ADVANCED', durationMinutes: 25 },
  { name: 'Sprint & Squat HIIT', category: 'HIIT', difficulty: 'ADVANCED', durationMinutes: 25 },

  // YOGA
  {
    name: 'Gentle Morning Yoga Flow',
    category: 'YOGA',
    difficulty: 'BEGINNER',
    durationMinutes: 20,
  },
  {
    name: 'Beginner Sun Salutations',
    category: 'YOGA',
    difficulty: 'BEGINNER',
    durationMinutes: 15,
  },
  { name: 'Power Yoga Flow', category: 'YOGA', difficulty: 'INTERMEDIATE', durationMinutes: 30 },
  { name: 'Vinyasa Flow', category: 'YOGA', difficulty: 'INTERMEDIATE', durationMinutes: 30 },
  {
    name: 'Advanced Ashtanga Sequence',
    category: 'YOGA',
    difficulty: 'ADVANCED',
    durationMinutes: 45,
  },
  { name: 'Inversion Yoga Flow', category: 'YOGA', difficulty: 'ADVANCED', durationMinutes: 40 },

  // STRETCHING
  {
    name: 'Full Body Stretch Routine',
    category: 'STRETCHING',
    difficulty: 'BEGINNER',
    durationMinutes: 10,
  },
  {
    name: 'Hamstring & Calf Stretch',
    category: 'STRETCHING',
    difficulty: 'BEGINNER',
    muscleGroup: 'legs',
    durationMinutes: 10,
  },
  {
    name: 'Dynamic Stretching Routine',
    category: 'STRETCHING',
    difficulty: 'INTERMEDIATE',
    durationMinutes: 15,
  },
  {
    name: 'Hip Mobility Flow',
    category: 'STRETCHING',
    difficulty: 'INTERMEDIATE',
    muscleGroup: 'hips',
    durationMinutes: 15,
  },
  {
    name: 'Deep Stretch & Mobility Flow',
    category: 'STRETCHING',
    difficulty: 'ADVANCED',
    durationMinutes: 25,
  },
  {
    name: 'Split Progression Stretch',
    category: 'STRETCHING',
    difficulty: 'ADVANCED',
    muscleGroup: 'legs',
    durationMinutes: 20,
  },
];

async function main() {
  for (const exercise of exercises) {
    const existing = await prisma.exercise.findFirst({ where: { name: exercise.name } });
    if (!existing) {
      await prisma.exercise.create({ data: exercise });
    }
  }
  const count = await prisma.exercise.count();
  console.log(`Exercise library seeded. Total exercises: ${count}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
