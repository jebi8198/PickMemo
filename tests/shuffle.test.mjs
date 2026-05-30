import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSessionQueue, fisherYatesShuffle } from '../src/lib/shuffle.ts';

const now = Date.now();

function makePage(id, nextReviewOffsetDays) {
  return {
    _id: id,
    notebookId: 'notebook',
    userId: 'user',
    topic: id,
    description: id,
    keywords: [],
    difficultyWeight: 1,
    reviewCount: 1,
    nextReviewDate: new Date(now + nextReviewOffsetDays * 24 * 60 * 60 * 1000),
    intervalDays: 1,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

test('fisherYatesShuffle keeps all items without mutating the input', () => {
  const input = [1, 2, 3, 4, 5];
  const output = fisherYatesShuffle(input);

  assert.deepEqual(input, [1, 2, 3, 4, 5]);
  assert.deepEqual([...output].sort(), input);
});

test('buildSessionQueue prioritizes due pages before future pages', () => {
  const dueA = makePage('due-a', -1);
  const dueB = makePage('due-b', 0);
  const future = makePage('future', 3);

  const queue = buildSessionQueue([future, dueA, dueB], 2);
  const ids = new Set(queue.map((page) => page._id));

  assert.equal(queue.length, 2);
  assert.ok(ids.has('due-a'));
  assert.ok(ids.has('due-b'));
});

test('buildSessionQueue does not include future pages in review mode', () => {
  const due = makePage('due', -1);
  const future = makePage('future', 3);

  const queue = buildSessionQueue([future, due], 2);
  const ids = new Set(queue.map((page) => page._id));

  assert.equal(queue.length, 1);
  assert.ok(ids.has('due'));
  assert.equal(ids.has('future'), false);
});
