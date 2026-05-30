import type { IPage } from '@/types';

export function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function buildSessionQueue(pages: IPage[], count: number): IPage[] {
  const now = new Date();
  const duePages = pages.filter((page) => new Date(page.nextReviewDate) <= now);
  return fisherYatesShuffle(duePages).slice(0, count);
}
