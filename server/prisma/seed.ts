import 'dotenv/config';
import argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type Category = 'GYM' | 'HOME' | 'CARDIO' | 'HIIT' | 'YOGA' | 'STRETCHING';
type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
type MeditationCategory =
  | 'BREATHING'
  | 'BODY_SCAN'
  | 'SLEEP'
  | 'FOCUS'
  | 'STRESS_RELIEF'
  | 'MINDFULNESS';
type ChallengeMetric = 'MEDITATION_MINUTES' | 'MOOD_LOGS' | 'SLEEP_LOGS' | 'ACTIVE_DAYS';
type ExpertRole = 'NUTRITIONIST' | 'DOCTOR' | 'COACH';

const DEMO_EXPERT_PASSWORD = 'ExpertDemo123!';

interface ExpertSeed {
  email: string;
  name: string;
  role: ExpertRole;
  specialty: string;
  focusArea: string;
  bio: string;
  credentials?: string;
  yearsExperience?: number;
}

const experts: ExpertSeed[] = [
  {
    email: 'dr.amina.rahman@benifits.demo',
    name: 'Dr. Amina Rahman',
    role: 'NUTRITIONIST',
    specialty: 'Weight Management',
    focusArea: 'Sustainable fat loss for busy professionals',
    bio: 'Registered dietitian with a decade of experience building realistic, non-restrictive nutrition plans.',
    credentials: 'RD, MSc Clinical Nutrition',
    yearsExperience: 10,
  },
  {
    email: 'dr.karim.hasan@benifits.demo',
    name: 'Dr. Karim Hasan',
    role: 'DOCTOR',
    specialty: 'Sports Medicine',
    focusArea: 'Injury prevention and recovery for active adults',
    bio: 'Sports medicine physician helping recreational and competitive athletes train without breaking down.',
    credentials: 'MBBS, Diploma in Sports Medicine',
    yearsExperience: 14,
  },
  {
    email: 'coach.elena.vasquez@benifits.demo',
    name: 'Elena Vasquez',
    role: 'COACH',
    specialty: 'Strength Training',
    focusArea: 'Beginner-friendly strength programs',
    bio: 'Certified strength coach specializing in taking absolute beginners through their first year of lifting.',
    credentials: 'NSCA-CSCS',
    yearsExperience: 7,
  },
  {
    email: 'dr.sofia.mendes@benifits.demo',
    name: 'Dr. Sofia Mendes',
    role: 'NUTRITIONIST',
    specialty: 'Diabetes Care',
    focusArea: 'Blood-sugar-friendly meal planning',
    bio: 'Clinical nutritionist focused on helping clients manage type 2 diabetes through diet.',
    credentials: 'RD, CDCES',
    yearsExperience: 9,
  },
  {
    email: 'coach.james.okafor@benifits.demo',
    name: 'James Okafor',
    role: 'COACH',
    specialty: 'Cardio Conditioning',
    focusArea: 'Building endurance from a sedentary baseline',
    bio: 'Endurance coach who works with clients starting from zero to their first 5K and beyond.',
    credentials: 'ACE-CPT',
    yearsExperience: 5,
  },
];

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

async function seedExercises() {
  for (const exercise of exercises) {
    const existing = await prisma.exercise.findFirst({ where: { name: exercise.name } });
    if (!existing) {
      await prisma.exercise.create({ data: exercise });
    }
  }
  const count = await prisma.exercise.count();
  console.log(`Exercise library seeded. Total exercises: ${count}`);
}

async function seedExperts() {
  const passwordHash = await argon2.hash(DEMO_EXPERT_PASSWORD);

  for (const expert of experts) {
    const { email, name, role, specialty, focusArea, bio, credentials, yearsExperience } = expert;

    const user = await prisma.user.upsert({
      where: { email },
      create: { email, name, role, passwordHash },
      update: { name, role },
    });

    await prisma.expertProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, specialty, focusArea, bio, credentials, yearsExperience },
      update: { specialty, focusArea, bio, credentials, yearsExperience },
    });
  }

  console.log(
    `Demo experts seeded: ${experts.length} accounts (password: "${DEMO_EXPERT_PASSWORD}").`,
  );
}

interface MeditationSessionSeed {
  title: string;
  category: MeditationCategory;
  durationMinutes: number;
  description: string;
}

const meditationSessions: MeditationSessionSeed[] = [
  {
    title: 'Box Breathing',
    category: 'BREATHING',
    durationMinutes: 5,
    description: 'A 4-4-4-4 breathing pattern to quickly settle the nervous system.',
  },
  {
    title: '4-7-8 Breathing',
    category: 'BREATHING',
    durationMinutes: 10,
    description: 'Inhale for 4, hold for 7, exhale for 8 — a classic calming breath ratio.',
  },
  {
    title: 'Deep Belly Breathing',
    category: 'BREATHING',
    durationMinutes: 15,
    description: 'Slow diaphragmatic breathing to lower heart rate and ease tension.',
  },
  {
    title: 'Full Body Scan',
    category: 'BODY_SCAN',
    durationMinutes: 15,
    description: 'A head-to-toe scan noticing sensation and releasing tension in each area.',
  },
  {
    title: 'Quick Tension Release',
    category: 'BODY_SCAN',
    durationMinutes: 5,
    description: 'A fast pass over the shoulders, jaw, and hands to release held tension.',
  },
  {
    title: 'Progressive Muscle Relaxation',
    category: 'BODY_SCAN',
    durationMinutes: 20,
    description: 'Systematically tense and release each muscle group from feet to head.',
  },
  {
    title: 'Wind-Down for Sleep',
    category: 'SLEEP',
    durationMinutes: 10,
    description: 'A slow, quiet session to ease the transition from wakefulness into sleep.',
  },
  {
    title: 'Sleep Body Scan',
    category: 'SLEEP',
    durationMinutes: 20,
    description: 'An extended, unhurried body scan designed to be practiced lying in bed.',
  },
  {
    title: 'Midnight Wake-Up Reset',
    category: 'SLEEP',
    durationMinutes: 5,
    description: 'A short breathing exercise for falling back asleep after waking at night.',
  },
  {
    title: 'Single-Point Focus',
    category: 'FOCUS',
    durationMinutes: 10,
    description: 'Anchor attention on the breath and gently return whenever it wanders.',
  },
  {
    title: 'Pre-Work Focus Reset',
    category: 'FOCUS',
    durationMinutes: 5,
    description: 'A brief session to clear mental clutter before a demanding task.',
  },
  {
    title: 'Deep Work Primer',
    category: 'FOCUS',
    durationMinutes: 15,
    description: 'Build sustained concentration before a long stretch of focused work.',
  },
  {
    title: 'Stress Release Breathing',
    category: 'STRESS_RELIEF',
    durationMinutes: 10,
    description: 'Extended exhales to activate the parasympathetic nervous system.',
  },
  {
    title: 'Letting Go of the Day',
    category: 'STRESS_RELIEF',
    durationMinutes: 15,
    description: 'Process and release the accumulated tension of a difficult day.',
  },
  {
    title: 'Anxiety Grounding',
    category: 'STRESS_RELIEF',
    durationMinutes: 5,
    description: 'A grounding technique using the senses to interrupt anxious spirals.',
  },
  {
    title: 'Mindful Awareness',
    category: 'MINDFULNESS',
    durationMinutes: 10,
    description: 'Observe thoughts and sensations without judgment as they arise and pass.',
  },
  {
    title: 'Gratitude Practice',
    category: 'MINDFULNESS',
    durationMinutes: 10,
    description: 'A guided reflection on people, moments, and things to be grateful for.',
  },
  {
    title: 'Mindful Walking',
    category: 'MINDFULNESS',
    durationMinutes: 20,
    description: 'Bring full attention to the sensations of walking, indoors or outside.',
  },
];

async function seedMeditationSessions() {
  for (const session of meditationSessions) {
    const existing = await prisma.meditationSession.findFirst({ where: { title: session.title } });
    if (!existing) {
      await prisma.meditationSession.create({ data: session });
    }
  }
  const count = await prisma.meditationSession.count();
  console.log(`Meditation library seeded. Total sessions: ${count}`);
}

interface ChallengeSeed {
  title: string;
  description: string;
  metric: ChallengeMetric;
  startsAgoDays: number;
  totalDays: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const challenges: ChallengeSeed[] = [
  {
    title: '14-Day Meditation Streak',
    description: 'Rack up as many meditation minutes as you can over two weeks.',
    metric: 'MEDITATION_MINUTES',
    startsAgoDays: 3,
    totalDays: 14,
  },
  {
    title: 'Mood Check-In Challenge',
    description: 'Log your mood as many days as possible this month.',
    metric: 'MOOD_LOGS',
    startsAgoDays: 5,
    totalDays: 30,
  },
  {
    title: 'Better Sleep Challenge',
    description: 'Log a night of sleep as consistently as you can over three weeks.',
    metric: 'SLEEP_LOGS',
    startsAgoDays: 2,
    totalDays: 21,
  },
  {
    title: 'Wellness Consistency Challenge',
    description: 'Be active in mood, sleep, or meditation tracking on as many days as possible.',
    metric: 'ACTIVE_DAYS',
    startsAgoDays: 7,
    totalDays: 30,
  },
];

async function seedChallenges() {
  for (const challenge of challenges) {
    const existing = await prisma.challenge.findFirst({ where: { title: challenge.title } });
    if (!existing) {
      const startsAt = new Date(Date.now() - challenge.startsAgoDays * DAY_MS);
      const endsAt = new Date(
        startsAt.getTime() + challenge.totalDays * DAY_MS,
      );
      await prisma.challenge.create({
        data: {
          title: challenge.title,
          description: challenge.description,
          metric: challenge.metric,
          startsAt,
          endsAt,
        },
      });
    }
  }
  const count = await prisma.challenge.count();
  console.log(`Challenges seeded. Total challenges: ${count}`);
}

async function main() {
  await seedExercises();
  await seedExperts();
  await seedMeditationSessions();
  await seedChallenges();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
