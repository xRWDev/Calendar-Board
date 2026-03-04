import type { DateKey } from './types.js';

export const WEEK_START_MONDAY = 1; // 0 = Sunday, 1 = Monday

export function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

export function toDateKey(date: Date): DateKey {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
}

export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isValidDateKey(value: string): value is DateKey {
  const match = /^\d{4}-\d{2}-\d{2}$/.exec(value);
  if (!match) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
  );
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
  return next;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function getMonthLabel(date: Date, locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}

export interface MonthGrid {
  start: Date;
  end: Date;
  days: Date[];
}

export function buildMonthGrid(date: Date, weekStart: 0 | 1 = WEEK_START_MONDAY): MonthGrid {
  const first = startOfMonth(date);
  const firstDay = first.getDay(); // 0..6 (Sun..Sat)
  const offset = weekStart === 1 ? (firstDay + 6) % 7 : firstDay;
  const gridStart = addDays(first, -offset);
  const days: Date[] = [];
  for (let i = 0; i < 42; i += 1) {
    days.push(addDays(gridStart, i));
  }
  const gridEnd = days[days.length - 1];
  return { start: gridStart, end: gridEnd, days };
}
