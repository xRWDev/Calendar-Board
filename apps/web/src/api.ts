import type { Task, TaskCreateInput, TaskReorderUpdate, TaskUpdateInput } from '@calendar/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const TOKEN_KEY = 'calendar-token';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (!token) {
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }
  window.localStorage.setItem(TOKEN_KEY, token);
}

function authHeaders() {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    if (text) {
      try {
        const parsed = JSON.parse(text) as { error?: string };
        if (parsed?.error) {
          throw new Error(parsed.error);
        }
      } catch {
        // ignore JSON parsing errors
      }
    }
    throw new Error(text || 'Request failed');
  }
  return (await res.json()) as T;
}

export async function fetchTasks(from: string, to: string): Promise<Task[]> {
  const res = await fetch(`${API_URL}/api/tasks?from=${from}&to=${to}`, {
    headers: { ...authHeaders() },
  });
  const data = await handleResponse<{ tasks: Task[] }>(res);
  return data.tasks;
}

export async function createTask(input: TaskCreateInput): Promise<Task> {
  const res = await fetch(`${API_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  const data = await handleResponse<{ task: Task }>(res);
  return data.task;
}

export async function updateTask(id: string, input: TaskUpdateInput): Promise<Task> {
  const res = await fetch(`${API_URL}/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  const data = await handleResponse<{ task: Task }>(res);
  return data.task;
}

export async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/tasks/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    throw new Error('Delete failed');
  }
}

export async function reorderTasks(updates: TaskReorderUpdate[]): Promise<void> {
  const res = await fetch(`${API_URL}/api/tasks/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ updates }),
  });
  if (!res.ok) {
    throw new Error('Reorder failed');
  }
}

export async function registerUser(username: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return handleResponse<{
    token: string;
    user: { username: string; color?: string; role?: string };
  }>(res);
}

export async function loginUser(username: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return handleResponse<{
    token: string;
    user: { username: string; color?: string; role?: string };
  }>(res);
}
