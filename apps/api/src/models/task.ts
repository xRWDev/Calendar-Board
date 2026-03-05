import mongoose, { Schema } from 'mongoose';

export interface TaskDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  isAdmin: boolean;
  title: string;
  notes?: string;
  date: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<TaskDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isAdmin: { type: Boolean, default: false },
    title: { type: String, required: true, minlength: 1, maxlength: 200, trim: true },
    notes: { type: String, maxlength: 2000, default: undefined },
    date: { type: String, required: true },
    order: { type: Number, required: true },
  },
  { timestamps: true }
);

TaskSchema.index({ userId: 1, date: 1, order: 1 });

TaskSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret: any) => {
    const { _id, userId, ...rest } = ret;
    return { ...rest, id: _id?.toString() };
  },
});

export const TaskModel = mongoose.model<TaskDocument>('Task', TaskSchema);
