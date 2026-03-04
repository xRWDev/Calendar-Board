import express from 'express';
import { TaskModel } from '../models/task.js';
import {
  isValidDate,
  isValidNotes,
  isValidOrder,
  isValidTitle,
} from '../utils/validation.js';

export const tasksRouter = express.Router();

tasksRouter.get('/', async (req, res) => {
  const { from, to } = req.query;
  if (!isValidDate(from) || !isValidDate(to)) {
    return res.status(400).json({ error: 'Invalid from/to date' });
  }

  const tasks = await TaskModel.find({
    date: { $gte: from, $lte: to },
  }).sort({ date: 1, order: 1 });

  return res.json({ tasks: tasks.map((task) => task.toJSON()) });
});

tasksRouter.post('/', async (req, res) => {
  const { title, notes, date } = req.body as {
    title?: unknown;
    notes?: unknown;
    date?: unknown;
  };

  if (!isValidTitle(title) || !isValidDate(date) || !isValidNotes(notes)) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const maxOrder = await TaskModel.findOne({ date }).sort({ order: -1 }).lean();
  const nextOrder = maxOrder ? maxOrder.order + 1 : 0;

  const task = await TaskModel.create({
    title: title.trim(),
    notes: typeof notes === 'string' ? notes : undefined,
    date,
    order: nextOrder,
  });

  return res.status(201).json({ task: task.toJSON() });
});

tasksRouter.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, notes, date, order } = req.body as {
    title?: unknown;
    notes?: unknown;
    date?: unknown;
    order?: unknown;
  };

  const update: Record<string, unknown> = {};

  if (title !== undefined) {
    if (!isValidTitle(title)) {
      return res.status(400).json({ error: 'Invalid title' });
    }
    update.title = title.trim();
  }

  if (notes !== undefined) {
    if (!isValidNotes(notes)) {
      return res.status(400).json({ error: 'Invalid notes' });
    }
    update.notes = notes === '' ? undefined : notes;
  }

  let nextOrder: number | undefined;
  if (date !== undefined) {
    if (!isValidDate(date)) {
      return res.status(400).json({ error: 'Invalid date' });
    }
    update.date = date;
    if (order === undefined) {
      const maxOrder = await TaskModel.findOne({ date }).sort({ order: -1 }).lean();
      nextOrder = maxOrder ? maxOrder.order + 1 : 0;
      update.order = nextOrder;
    }
  }

  if (order !== undefined) {
    if (!isValidOrder(order)) {
      return res.status(400).json({ error: 'Invalid order' });
    }
    update.order = order;
  }

  const task = await TaskModel.findByIdAndUpdate(id, update, { new: true });
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  return res.json({ task: task.toJSON() });
});

tasksRouter.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const deleted = await TaskModel.findByIdAndDelete(id);
  if (!deleted) {
    return res.status(404).json({ error: 'Task not found' });
  }
  return res.status(204).send();
});

tasksRouter.post('/reorder', async (req, res) => {
  const { updates } = req.body as {
    updates?: Array<{ id?: unknown; date?: unknown; order?: unknown }>;
  };

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: 'Updates required' });
  }

  const bulkOps = [] as Parameters<typeof TaskModel.bulkWrite>[0];
  for (const update of updates) {
    if (
      !update ||
      typeof update.id !== 'string' ||
      !isValidDate(update.date) ||
      !isValidOrder(update.order)
    ) {
      return res.status(400).json({ error: 'Invalid update payload' });
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: update.id },
        update: { $set: { date: update.date, order: update.order } },
      },
    });
  }

  if (bulkOps.length === 0) {
    return res.status(400).json({ error: 'No updates applied' });
  }

  await TaskModel.bulkWrite(bulkOps);
  return res.json({ ok: true });
});
