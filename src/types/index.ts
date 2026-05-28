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

export type FeedbackType = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

export interface SessionConfig {
  notebookId: string;
  count: number;
}

export interface SessionResult {
  pages: IPage[];
  totalAvailable: number;
  reviewDueCount: number;
}
