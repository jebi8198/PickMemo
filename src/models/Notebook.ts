import mongoose, { Schema, Document } from 'mongoose';

export interface INotebookDocument extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  color: string;
  isPublic: boolean;
  pageCount: number;
  reviewDueCount: number;
  isPaused: boolean;
  pausedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotebookSchema = new Schema<INotebookDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    color: { type: String, default: '#8b5e3c' },
    isPublic: { type: Boolean, default: false },
    pageCount: { type: Number, default: 0 },
    reviewDueCount: { type: Number, default: 0 },
    isPaused: { type: Boolean, default: false, index: true },
    pausedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.Notebook || mongoose.model<INotebookDocument>('Notebook', NotebookSchema);
