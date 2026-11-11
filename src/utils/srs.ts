import { CardProgress } from '../types';

export function getTodayDateString(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + Math.max(1, Math.round(days)));
  return d.toISOString().split('T')[0];
}

/**
 * SuperMemo SM-2 Spaced Repetition calculation
 * @param progress Existing progress or undefined
 * @param grade 0 (blackout) to 5 (perfect) or 1 (wrong), 4 (good), 5 (easy)
 */
export function calculateSM2(
  progress: CardProgress | undefined,
  cardId: string,
  setId: string,
  grade: number
): CardProgress {
  const current: CardProgress = progress || {
    cardId,
    setId,
    level: 'new',
    repetitions: 0,
    intervalDays: 1,
    easeFactor: 2.5,
    nextReviewDate: getTodayDateString(),
    correctCount: 0,
    wrongCount: 0,
  };

  const isSuccess = grade >= 3;
  let repetitions = current.repetitions;
  let intervalDays = current.intervalDays;
  let easeFactor = current.easeFactor;

  // Update ease factor: EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  if (isSuccess) {
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    repetitions += 1;
  } else {
    repetitions = 0;
    intervalDays = 1;
  }

  const today = getTodayDateString();
  const nextReviewDate = addDaysToDate(today, intervalDays);

  const level: CardProgress['level'] = repetitions >= 3 ? 'mastered' : 'learning';

  return {
    ...current,
    repetitions,
    intervalDays,
    easeFactor: parseFloat(easeFactor.toFixed(2)),
    nextReviewDate,
    lastReviewedAt: Date.now(),
    level,
    correctCount: current.correctCount + (isSuccess ? 1 : 0),
    wrongCount: current.wrongCount + (isSuccess ? 0 : 1),
  };
}

/**
 * Checks if a card is due for review today or overdue
 */
export function isCardDue(progress?: CardProgress): boolean {
  if (!progress) return true; // Unstudied cards are ready
  const today = getTodayDateString();
  return progress.nextReviewDate <= today;
}

/**
 * Calculate streak given the last study date and current streak
 */
export function updateStreak(lastStudyDate: string, currentStreak: number): { newStreak: number; newDate: string } {
  const today = getTodayDateString();
  if (lastStudyDate === today) {
    return { newStreak: currentStreak, newDate: today };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (lastStudyDate === yesterdayStr) {
    return { newStreak: currentStreak + 1, newDate: today };
  }

  // Missed more than a day
  return { newStreak: 1, newDate: today };
}
