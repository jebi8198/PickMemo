import mongoose, { Schema, Document } from 'mongoose';

export interface IPageDocument extends Document {
  notebookId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  topic: string;
  description: string;
  keywords: string[];
  imageUrl?: string;
  difficultyWeight: number;
  reviewCount: number;
  lastReviewedAt?: Date;
  nextReviewDate: Date;
  intervalDays: number;
  isPaused: boolean;
  pausedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PageSchema = new Schema<IPageDocument>(
  {
    notebookId: { type: Schema.Types.ObjectId, ref: 'Notebook', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    topic: { type: String, required: true },
    description: { type: String, required: true },
    keywords: [{ type: String }],
    imageUrl: { type: String },
    difficultyWeight: { type: Number, default: 1.0 },
    reviewCount: { type: Number, default: 0 },
    lastReviewedAt: { type: Date },
    nextReviewDate: { type: Date, default: Date.now },
    intervalDays: { type: Number, default: 0 },
    isPaused: { type: Boolean, default: false, index: true },
    pausedAt: { type: Date },
  },
  { timestamps: true }
);

PageSchema.index({ nextReviewDate: 1, userId: 1 });

export default mongoose.models.Page || mongoose.model<IPageDocument>('Page', PageSchema);
