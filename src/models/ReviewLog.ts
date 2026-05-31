import mongoose, { Schema, Document } from 'mongoose';
import type { FeedbackType } from '@/types';

export interface IReviewLogDocument extends Document {
  pageId: mongoose.Types.ObjectId;
  notebookId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  reviewedAt: Date;
  feedback: FeedbackType;
  previousIntervalDays: number;
  nextIntervalDays: number;
  previousDifficultyWeight: number;
  nextDifficultyWeight: number;
  previousReviewCount: number;
  nextReviewCount: number;
  nextReviewDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewLogSchema = new Schema<IReviewLogDocument>(
  {
    pageId: { type: Schema.Types.ObjectId, ref: 'Page', required: true, index: true },
    notebookId: { type: Schema.Types.ObjectId, ref: 'Notebook', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reviewedAt: { type: Date, required: true, index: true },
    feedback: {
      type: String,
      required: true,
      enum: ['AGAIN', 'HARD', 'GOOD', 'EASY'],
    },
    previousIntervalDays: { type: Number, required: true },
    nextIntervalDays: { type: Number, required: true },
    previousDifficultyWeight: { type: Number, required: true },
    nextDifficultyWeight: { type: Number, required: true },
    previousReviewCount: { type: Number, required: true },
    nextReviewCount: { type: Number, required: true },
    nextReviewDate: { type: Date, required: true },
  },
  { timestamps: true }
);

ReviewLogSchema.index({ userId: 1, pageId: 1, reviewedAt: 1 });

export default mongoose.models.ReviewLog || mongoose.model<IReviewLogDocument>('ReviewLog', ReviewLogSchema);
