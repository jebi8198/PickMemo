import mongoose, { Schema, Document } from 'mongoose';

export interface IUserDocument extends Document {
  email: string;
  password?: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true, select: false },
    name: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);
