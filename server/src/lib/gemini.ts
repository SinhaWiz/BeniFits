import { AppError } from '../errors/AppError';

export const GEMINI_MODEL = 'gemini-2.5-flash';

// @google/genai is ESM-only while this package is CommonJS, so even a
// type-only static import trips TypeScript's Node16 CJS/ESM interop rules.
// The client is loaded via dynamic import() (which works from CJS) and
// described here by a minimal local interface covering only what this app
// calls, rather than importing the SDK's own types.
interface GeminiContentPart {
  text: string;
}
interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiContentPart[];
}
interface GeminiGenerateContentParams {
  model: string;
  contents: GeminiContent[];
  config?: {
    systemInstruction?: string;
    maxOutputTokens?: number;
    responseMimeType?: string;
    responseSchema?: unknown;
  };
}
interface GeminiGenerateContentResponse {
  text?: string;
}
export interface GeminiClient {
  models: {
    generateContent: (
      params: GeminiGenerateContentParams,
    ) => Promise<GeminiGenerateContentResponse>;
    generateContentStream: (
      params: GeminiGenerateContentParams,
    ) => Promise<AsyncIterable<GeminiGenerateContentResponse>>;
  };
}

let client: GeminiClient | null = null;

export async function getGeminiClient(): Promise<GeminiClient> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AppError(503, 'AI features are not configured (missing GEMINI_API_KEY)');
  }
  if (!client) {
    const { GoogleGenAI } = await import('@google/genai');
    client = new GoogleGenAI({ apiKey }) as unknown as GeminiClient;
  }
  return client;
}

interface HealthProfileContext {
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: string | null;
  goal: string | null;
  diseases: string[];
  allergies: string[];
  foodPreferences: string[];
}

const SAFETY_RULES = [
  "You are BeniFits' AI nutrition assistant, embedded in a health and wellness app.",
  'Answer nutrition, meal-planning, and healthy-eating questions clearly and practically.',
  '',
  'Safety rules (follow strictly):',
  '- You are not a doctor. Never diagnose medical conditions or prescribe medication or treatment.',
  '- For symptoms, medical concerns, or anything requiring a diagnosis, tell the user to consult a qualified healthcare professional.',
  '- If the user describes a medical emergency, tell them to seek immediate medical attention.',
  '- Keep answers concise and practical; avoid unnecessarily long responses.',
];

export function buildNutritionSystemPrompt(profile: HealthProfileContext | null): string {
  const lines = [...SAFETY_RULES];

  if (profile) {
    const details: string[] = [];
    if (profile.age) details.push(`age ${profile.age}`);
    if (profile.heightCm) details.push(`height ${profile.heightCm}cm`);
    if (profile.weightKg) details.push(`weight ${profile.weightKg}kg`);
    if (profile.activityLevel) details.push(`activity level ${profile.activityLevel}`);
    if (profile.goal) details.push(`goal ${profile.goal}`);
    if (profile.diseases.length > 0)
      details.push(`known conditions: ${profile.diseases.join(', ')}`);
    if (profile.allergies.length > 0) details.push(`allergies: ${profile.allergies.join(', ')}`);
    if (profile.foodPreferences.length > 0) {
      details.push(`food preferences: ${profile.foodPreferences.join(', ')}`);
    }

    if (details.length > 0) {
      lines.push(
        '',
        `User context (use this to tailor advice; do not just repeat it back): ${details.join('; ')}.`,
      );
    }
  }

  return lines.join('\n');
}
