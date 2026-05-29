export interface IUser {
  _id: string;
  email: string;
  password?: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotebook {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  color: string;
  isPublic: boolean;
  pageCount: number;
  reviewDueCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPage {
  _id: string;
  notebookId: string;
  userId: string;
  topic: string;
  description: string;
  keywords: string[];
  imageUrl?: string;
  difficultyWeight: number;
  reviewCount: number;
  lastReviewedAt?: Date;
  nextReviewDate: Date;
  intervalDays: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISessionSeparator {
  _id: string;
  isSeparator: true;
  nextNotebookTitle: string;
  topic: string;
  description: string;
  keywords: string[];
  reviewCount: number;
  intervalDays: number;
  difficultyWeight: number;
  createdAt: Date;
  updatedAt: Date;
}

export type SessionQueueItem = IPage | ISessionSeparator;

export type FeedbackType = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

export interface SessionConfig {
  notebookId: string;
  count: number;
}

export interface SessionResult {
  pages: SessionQueueItem[];
  totalAvailable: number;
  reviewDueCount: number;
}
