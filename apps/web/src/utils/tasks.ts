import type { Task, TaskReorderUpdate } from '@calendar/shared';

export function normalizeTasks(tasks: Task[], dateKeys: string[]): Record<string, Task[]> {
  const map: Record<string, Task[]> = {};
  dateKeys.forEach((key) => {
    map[key] = [];
  });

  tasks.forEach((task) => {
    if (!map[task.date]) {
      map[task.date] = [];
    }
    map[task.date].push({ ...task, clientId: task.clientId ?? task.id });
  });

  Object.keys(map).forEach((key) => {
    map[key].sort((a, b) => a.order - b.order);
  });

  return map;
}

export function resequenceTasks(tasks: Task[]): { tasks: Task[]; updates: TaskReorderUpdate[] } {
  const updates: TaskReorderUpdate[] = [];
  const next = tasks.map((task, index) => {
    if (task.order !== index) {
      updates.push({ id: task.id, date: task.date, order: index });
      return { ...task, order: index };
    }
    return task;
  });
  return { tasks: next, updates };
}

export function reorderWithinDate(tasks: Task[], fromIndex: number, toIndex: number): Task[] {
  const next = [...tasks];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next.map((task, index) => ({ ...task, order: index }));
}
