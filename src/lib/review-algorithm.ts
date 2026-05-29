import type { FeedbackType } from '@/types';

export interface ReviewResult {
  nextReviewDate: Date;
  intervalDays: number;
  difficultyWeight: number;
  reviewCount: number;
}

export function calculateNextReview(
  feedback: FeedbackType,
  currentInterval: number,
  currentDifficulty: number,
  currentReviewCount: number,
  now = new Date()
): ReviewResult {
  const normalizedDifficulty = Math.min(3.0, Math.max(0.5, currentDifficulty || 1.0));
  let intervalDays: number;
  let difficultyWeight: number;

  switch (feedback) {
    case 'AGAIN':
      intervalDays = 0;
      difficultyWeight = Math.min(3.0, normalizedDifficulty + 0.35);
      break;
    case 'HARD':
      intervalDays = currentReviewCount === 0 ? 1 : Math.max(1, currentInterval * 1.15);
      difficultyWeight = Math.min(3.0, normalizedDifficulty + 0.18);
      break;
    case 'GOOD':
      intervalDays = currentReviewCount === 0
        ? 1
        : Math.max(1, currentInterval * (2.2 / normalizedDifficulty));
      difficultyWeight = Math.max(0.5, normalizedDifficulty - 0.04);
      break;
    case 'EASY':
      intervalDays = currentReviewCount === 0
        ? 3
        : Math.max(2, currentInterval * (2.8 / normalizedDifficulty) + 1);
      difficultyWeight = Math.max(0.5, normalizedDifficulty - 0.18);
      break;
  }

  intervalDays = Math.round(intervalDays * 10) / 10;
  const nextReviewDate = new Date(now);
  if (intervalDays > 0) {
    nextReviewDate.setTime(nextReviewDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  }

  return {
    nextReviewDate,
    intervalDays,
    difficultyWeight: Math.round(difficultyWeight * 100) / 100,
    reviewCount: currentReviewCount + 1,
  };
}
