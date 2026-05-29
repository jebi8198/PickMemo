import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateNotebookInput,
  validatePagePayloads,
  validateRegisterInput,
  validateSessionStartInput,
} from '../src/lib/validation.ts';

test('validateRegisterInput normalizes email and enforces password length', () => {
  const valid = validateRegisterInput({
    name: '  User  ',
    email: '  USER@example.COM ',
    password: 'password123',
  });
  const invalid = validateRegisterInput({
    name: 'User',
    email: 'user@example.com',
    password: 'short',
  });

  assert.equal(valid.ok, true);
  assert.equal(valid.value.email, 'user@example.com');
  assert.equal(invalid.ok, false);
});

test('validateNotebookInput requires a title and hex color', () => {
  assert.equal(validateNotebookInput({ title: '', color: '#8b5e3c' }).ok, false);
  assert.equal(validateNotebookInput({ title: 'Notebook', color: 'brown' }).ok, false);
  assert.equal(validateNotebookInput({ title: 'Notebook', color: '#8b5e3c' }).ok, true);
});

test('validatePagePayloads limits bulk input and cleans keywords', () => {
  const valid = validatePagePayloads([
    {
      topic: 'Topic',
      description: 'Description',
      keywords: [' a ', '', 'b'],
      imageUrl: 'https://example.com/image.png',
    },
  ]);
  const tooMany = validatePagePayloads(Array.from({ length: 201 }, () => ({
    topic: 'Topic',
    description: 'Description',
    keywords: [],
  })));

  assert.equal(valid.ok, true);
  assert.deepEqual(valid.value[0].keywords, ['a', 'b']);
  assert.equal(tooMany.ok, false);
});

test('validateSessionStartInput caps invalid counts and notebook ids', () => {
  assert.equal(validateSessionStartInput({ notebookId: 'all', count: 10, mode: 'review' }).ok, true);
  assert.equal(validateSessionStartInput({ notebookId: 'bad-id', count: 10 }).ok, false);
  assert.equal(validateSessionStartInput({ notebookId: 'all', count: 101 }).ok, false);
});
