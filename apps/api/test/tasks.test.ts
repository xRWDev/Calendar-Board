import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDb, disconnectDb } from '../src/db.js';

let mongo: MongoMemoryServer;
const app = createApp();

describe('tasks api', () => {
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await connectDb(mongo.getUri());
  });

  afterAll(async () => {
    await disconnectDb();
    await mongo.stop();
  });

  afterEach(async () => {
    await mongoose.connection.db.dropDatabase();
  });

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('creates and lists tasks within range', async () => {
    const createRes = await request(app).post('/api/tasks').send({
      title: 'Test task',
      date: '2026-03-10',
    });
    expect(createRes.status).toBe(201);
    expect(createRes.body.task.title).toBe('Test task');

    const listRes = await request(app)
      .get('/api/tasks')
      .query({ from: '2026-03-01', to: '2026-03-31' });

    expect(listRes.status).toBe(200);
    expect(listRes.body.tasks).toHaveLength(1);
    expect(listRes.body.tasks[0].date).toBe('2026-03-10');
  });

  it('reorders tasks within a day', async () => {
    const first = await request(app).post('/api/tasks').send({
      title: 'First',
      date: '2026-03-12',
    });
    const second = await request(app).post('/api/tasks').send({
      title: 'Second',
      date: '2026-03-12',
    });

    const updates = [
      { id: first.body.task.id, date: '2026-03-12', order: 1 },
      { id: second.body.task.id, date: '2026-03-12', order: 0 },
    ];

    const reorderRes = await request(app).post('/api/tasks/reorder').send({ updates });
    expect(reorderRes.status).toBe(200);

    const listRes = await request(app)
      .get('/api/tasks')
      .query({ from: '2026-03-12', to: '2026-03-12' });

    expect(listRes.status).toBe(200);
    expect(listRes.body.tasks[0].title).toBe('Second');
    expect(listRes.body.tasks[1].title).toBe('First');
  });
});
