import { isValidDateKey } from '@calendar/shared';

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

export function isValidTitle(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= 200;
}

export function isValidNotes(value: unknown): value is string | undefined {
  if (value === undefined) return true;
  if (value === null) return false;
  if (typeof value !== 'string') return false;
  return value.length <= 2000;
}

export function isValidOrder(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

export function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && isValidDateKey(value);
}
