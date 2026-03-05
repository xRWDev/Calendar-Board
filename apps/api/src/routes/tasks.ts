import express from 'express';
import { Types } from 'mongoose';
import { TaskModel } from '../models/task.js';
import { UserModel } from '../models/user.js';
import { DEFAULT_USER_COLOR } from '../utils/colors.js';
import { isValidDate, isValidNotes, isValidOrder, isValidTitle } from '../utils/validation.js';

export const tasksRouter = express.Router();

const mapTasksWithUsers = async (tasks: Array<any>) => {
  const userIds = Array.from(
    new Set(
      tasks
        .map((task) => task.userId?.toString())
        .filter((id): id is string => Boolean(id))
    )
  );

  const users = await UserModel.find(
    { _id: { $in: userIds } },
    'color role username'
  ).lean();
  const userMap = new Map(
    users.map((user) => [
      user._id.toString(),
      {
        color: user.color,
        isAdmin: user.role === 'admin',
        username: user.username,
      },
    ])
  );

  return tasks.map((task) => {
    const meta = userMap.get(task.userId?.toString() ?? '');
    const taskId = task._id?.toString() ?? task.id;
    return {
      id: taskId,
      title: task.title,
      notes: task.notes,
      date: task.date,
      order: task.order,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      color: meta?.color ?? DEFAULT_USER_COLOR,
      isAdmin: meta?.isAdmin ?? false,
    };
  });
};

tasksRouter.get('/', async (req, res) => {
  const { from, to } = req.query;
  if (!isValidDate(from) || !isValidDate(to)) {
    return res.status(400).json({ error: 'Invalid from/to date' });
  }
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const tasks = await TaskModel.find({
    date: { $gte: from, $lte: to },
  })
    .sort({ date: 1, order: 1 })
    .lean();

  const mapped = await mapTasksWithUsers(tasks);
  return res.json({ tasks: mapped });
});

tasksRouter.post('/', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
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
    userId: new Types.ObjectId(req.user.id),
    isAdmin: req.user.role === 'admin',
    title: title.trim(),
    notes: typeof notes === 'string' ? notes : undefined,
    date,
    order: nextOrder,
  });
  const mapped = (await mapTasksWithUsers([task.toObject()]))[0];
  return res.status(201).json({ task: mapped });
});

tasksRouter.patch('/:id', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
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
      const maxOrder = await TaskModel.findOne({ date })
        .sort({ order: -1 })
        .lean();
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

  const existing = await TaskModel.findById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const task = await TaskModel.findOneAndUpdate({ _id: id }, update, { new: true });
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  const mapped = (await mapTasksWithUsers([task.toObject()]))[0];
  return res.json({ task: mapped });
});

tasksRouter.delete('/:id', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { id } = req.params;
  const existing = await TaskModel.findById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Task not found' });
  }
  const deleted = await TaskModel.findOneAndDelete({ _id: id });
  if (!deleted) {
    return res.status(404).json({ error: 'Task not found' });
  }
  return res.status(204).send();
});

tasksRouter.post('/reorder', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { updates } = req.body as {
    updates?: Array<{ id?: unknown; date?: unknown; order?: unknown }>;
  };

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: 'Updates required' });
  }

  const ids = updates
    .map((update) => update?.id)
    .filter((id): id is string => typeof id === 'string');
  const objectIds = ids
    .filter((id) => Types.ObjectId.isValid(id))
    .map((id) => new Types.ObjectId(id));
  const existing = await TaskModel.find({ _id: { $in: objectIds } }, 'userId').lean();
  if (existing.length !== objectIds.length) {
    return res.status(404).json({ error: 'Task not found' });
  }
  const bulkOps = [] as Parameters<typeof TaskModel.bulkWrite>[0];
  for (const update of updates) {
    if (
      !update ||
      typeof update.id !== 'string' ||
      !Types.ObjectId.isValid(update.id) ||
      !isValidDate(update.date) ||
      !isValidOrder(update.order)
    ) {
      return res.status(400).json({ error: 'Invalid update payload' });
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: new Types.ObjectId(update.id) },
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
