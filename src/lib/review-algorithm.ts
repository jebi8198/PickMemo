import { FeedbackType } from '@/types';

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
  currentReviewCount: number
): ReviewResult {
  let intervalDays = 0;
  let difficultyWeight = currentDifficulty;

  switch (feedback) {
    case 'AGAIN':
      intervalDays = 0;
      difficultyWeight = Math.min(3.0, currentDifficulty * 1.3);
      break;
    case 'HARD':
      intervalDays = Math.max(1, currentInterval * 1.2);
      difficultyWeight = Math.min(3.0, currentDifficulty * 1.15);
      break;
    case 'GOOD':
      intervalDays = currentReviewCount === 0 ? 1 : Math.max(1, currentInterval * 2.0);
      difficultyWeight = currentDifficulty;
      break;
    case 'EASY':
      intervalDays = currentReviewCount === 0 ? 3 : Math.max(1, currentInterval * 2.5);
      difficultyWeight = Math.max(0.5, currentDifficulty * 0.85);
      break;
  }

  const nextReviewDate = new Date();
  if (intervalDays > 0) {
    nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);
  }

  return {
    nextReviewDate,
    intervalDays,
    difficultyWeight,
    reviewCount: currentReviewCount + 1,
  };
}
