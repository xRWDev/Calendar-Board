import mongoose, { Schema } from 'mongoose';

export interface TaskDocument extends mongoose.Document {
  title: string;
  notes?: string;
  date: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<TaskDocument>(
  {
    title: { type: String, required: true, minlength: 1, maxlength: 200, trim: true },
    notes: { type: String, maxlength: 2000, default: undefined },
    date: { type: String, required: true },
    order: { type: Number, required: true },
  },
  { timestamps: true }
);

TaskSchema.index({ date: 1, order: 1 });

TaskSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
  },
});

export const TaskModel = mongoose.model<TaskDocument>('Task', TaskSchema);
