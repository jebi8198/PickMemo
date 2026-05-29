import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNextReview } from '../src/lib/review-algorithm.ts';

const now = new Date('2026-05-29T00:00:00.000Z');

test('AGAIN schedules immediate retry and increases difficulty', () => {
  const result = calculateNextReview('AGAIN', 4, 1, 2, now);

  assert.equal(result.intervalDays, 0);
  assert.equal(result.reviewCount, 3);
  assert.ok(result.difficultyWeight > 1);
  assert.equal(result.nextReviewDate.getTime(), now.getTime());
});

test('EASY creates a longer interval than GOOD for reviewed cards', () => {
  const good = calculateNextReview('GOOD', 4, 1, 2, now);
  const easy = calculateNextReview('EASY', 4, 1, 2, now);

  assert.ok(easy.intervalDays > good.intervalDays);
  assert.ok(easy.difficultyWeight < good.difficultyWeight);
  assert.equal(easy.reviewCount, 3);
});

test('first review uses stable initial intervals', () => {
  assert.equal(calculateNextReview('HARD', 0, 1, 0, now).intervalDays, 1);
  assert.equal(calculateNextReview('GOOD', 0, 1, 0, now).intervalDays, 1);
  assert.equal(calculateNextReview('EASY', 0, 1, 0, now).intervalDays, 3);
});
