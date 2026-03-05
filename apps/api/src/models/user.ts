import mongoose, { Schema } from 'mongoose';

export interface UserDocument extends mongoose.Document {
  username: string;
  passwordHash: string;
  role: 'user' | 'admin';
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
  {
    username: { type: String, required: true, lowercase: true, trim: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    color: { type: String, default: undefined },
  },
  { timestamps: true }
);


UserSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret: any) => {
    const { _id, passwordHash, ...rest } = ret;
    return { ...rest, id: _id?.toString() };
  },
});

export const UserModel = mongoose.model<UserDocument>('User', UserSchema);
