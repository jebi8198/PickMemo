import mongoose from 'mongoose';
import type { FeedbackType } from '@/types';

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface NotebookInput {
  title: string;
  description: string;
  color: string;
}

export interface PageInput {
  topic: string;
  description: string;
  keywords: string[];
  imageUrl?: string;
}

export interface SessionStartInput {
  notebookId?: string;
  count: number;
  mode: 'review' | 'all';
}

function success<T>(value: T): ValidationResult<T> {
  return { ok: true, value };
}

function failure<T = never>(error: string): ValidationResult<T> {
  return { ok: false, error };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function cleanOptionalString(value: unknown, maxLength: number) {
  const cleaned = cleanString(value, maxLength);
  return cleaned;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function cleanImageUrl(value: unknown): string | undefined {
  const imageUrl = cleanOptionalString(value, 1000);
  if (!imageUrl) return undefined;

  try {
    const url = new URL(imageUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return imageUrl;
  } catch {
    return undefined;
  }
}

export function validateRegisterInput(body: unknown): ValidationResult<RegisterInput> {
  if (!isRecord(body)) return failure('Invalid request body');

  const name = cleanString(body.name, 80);
  const email = cleanString(body.email, 254).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';

  if (!name) return failure('Name is required');
  if (!email || !isValidEmail(email)) return failure('Valid email is required');
  if (password.length < 8) return failure('Password must be at least 8 characters');
  if (password.length > 128) return failure('Password is too long');

  return success({ name, email, password });
}

export function validateNotebookInput(body: unknown): ValidationResult<NotebookInput> {
  if (!isRecord(body)) return failure('Invalid request body');

  const title = cleanString(body.title, 120);
  const description = cleanOptionalString(body.description, 1000);
  const color = cleanString(body.color, 20) || '#8b5e3c';

  if (!title) return failure('Title is required');
  if (!isValidColor(color)) return failure('Color must be a hex value like #8b5e3c');

  return success({ title, description, color });
}

export function validatePagePayload(value: unknown): ValidationResult<PageInput> {
  if (!isRecord(value)) return failure('Each page must be an object');

  const topic = cleanString(value.topic, 200);
  const description = cleanString(value.description, 5000);
  const keywords = Array.isArray(value.keywords)
    ? value.keywords
        .filter((keyword): keyword is string => typeof keyword === 'string')
        .map((keyword) => keyword.trim().slice(0, 60))
        .filter(Boolean)
        .slice(0, 20)
    : [];
  const imageUrl = cleanImageUrl(value.imageUrl);

  if (!topic) return failure('Topic is required');
  if (!description) return failure('Description is required');

  return success({ topic, description, keywords, imageUrl });
}

export function validatePagePayloads(items: unknown[]): ValidationResult<PageInput[]> {
  if (items.length === 0) return failure('At least one page is required');
  if (items.length > 200) return failure('You can add up to 200 pages at once');

  const pages: PageInput[] = [];
  for (const item of items) {
    const result = validatePagePayload(item);
    if (!result.ok) return result;
    pages.push(result.value);
  }

  return success(pages);
}

export function validateFeedbackInput(body: unknown): ValidationResult<FeedbackType> {
  if (!isRecord(body)) return failure('Invalid request body');
  const feedback = body.feedback;

  if (feedback === 'AGAIN' || feedback === 'HARD' || feedback === 'GOOD' || feedback === 'EASY') {
    return success(feedback);
  }

  return failure('Invalid feedback type');
}

export function validateSessionStartInput(body: unknown): ValidationResult<SessionStartInput> {
  if (!isRecord(body)) return failure('Invalid request body');

  const notebookId = typeof body.notebookId === 'string' ? body.notebookId : undefined;
  const count = Number(body.count);
  const mode = body.mode === 'all' ? 'all' : 'review';

  if (!Number.isFinite(count) || count <= 0) return failure('Count must be a positive number');
  if (count > 100) return failure('Count cannot exceed 100');
  if (notebookId && notebookId !== 'all' && !mongoose.isValidObjectId(notebookId)) {
    return failure('Invalid notebookId');
  }

  return success({ notebookId, count: Math.floor(count), mode });
}

export function validateObjectIdList(value: unknown, fieldName: string, maxCount: number): ValidationResult<string[]> {
  const ids = Array.isArray(value)
    ? value.filter((id): id is string => typeof id === 'string')
    : [];

  if (ids.length === 0) return failure(`${fieldName} is required`);
  if (ids.length > maxCount) return failure(`You can submit up to ${maxCount} ids at once`);
  if (ids.some((id) => !mongoose.isValidObjectId(id))) return failure('Invalid id');

  return success(Array.from(new Set(ids)));
}
