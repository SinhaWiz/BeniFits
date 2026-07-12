export function computeSleepDurationMinutes(bedtime: Date, wakeTime: Date): number {
  return Math.round((wakeTime.getTime() - bedtime.getTime()) / 60000);
}
