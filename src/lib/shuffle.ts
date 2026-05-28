import { IPage } from '@/types';

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
  const futurePages = pages.filter((page) => new Date(page.nextReviewDate) > now);

  const shuffledDue = fisherYatesShuffle(duePages);
  
  if (shuffledDue.length >= count) {
    return shuffledDue.slice(0, count);
  }

  const needed = count - shuffledDue.length;
  const shuffledFuture = fisherYatesShuffle(futurePages);
  const selectedFuture = shuffledFuture.slice(0, needed);

  return fisherYatesShuffle([...shuffledDue, ...selectedFuture]);
}
