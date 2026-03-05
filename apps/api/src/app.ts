import cors from 'cors';
import express from 'express';
import { tasksRouter } from './routes/tasks.js';

const normalizeOrigin = (value: string) => value.replace(/\/$/, '');

const getAllowedOrigins = () => {
  const raw = process.env.CORS_ORIGIN;
  if (!raw) return ['*'];
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(normalizeOrigin);
};

export function createApp() {
  const app = express();
  const allowedOrigins = getAllowedOrigins();

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes('*')) return callback(null, true);
        const normalized = normalizeOrigin(origin);
        if (allowedOrigins.includes(normalized)) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      },
    })
  );
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/tasks', tasksRouter);

  return app;
}
