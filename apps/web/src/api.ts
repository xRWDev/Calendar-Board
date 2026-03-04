import type { Task, TaskCreateInput, TaskReorderUpdate, TaskUpdateInput } from '@calendar/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Request failed');
  }
  return (await res.json()) as T;
}

export async function fetchTasks(from: string, to: string): Promise<Task[]> {
  const res = await fetch(`${API_URL}/api/tasks?from=${from}&to=${to}`);
  const data = await handleResponse<{ tasks: Task[] }>(res);
  return data.tasks;
}

export async function createTask(input: TaskCreateInput): Promise<Task> {
  const res = await fetch(`${API_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await handleResponse<{ task: Task }>(res);
  return data.task;
}

export async function updateTask(id: string, input: TaskUpdateInput): Promise<Task> {
  const res = await fetch(`${API_URL}/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await handleResponse<{ task: Task }>(res);
  return data.task;
}

export async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/tasks/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Delete failed');
  }
}

export async function reorderTasks(updates: TaskReorderUpdate[]): Promise<void> {
  const res = await fetch(`${API_URL}/api/tasks/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updates }),
  });
  if (!res.ok) {
    throw new Error('Reorder failed');
  }
}
