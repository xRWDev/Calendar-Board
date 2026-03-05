import { ADMIN_COLOR } from '../config/auth.js';

const PALETTE = [
  '#1d4ed8', // blue
  '#16a34a', // green
  '#7c3aed', // violet
  '#db2777', // pink
  '#0ea5e9', // sky
  '#e11d48', // rose
  '#0f766e', // teal
  '#9333ea', // purple
  '#84cc16', // lime
  '#dc2626', // red
  '#4f46e5', // indigo
  '#06b6d4', // cyan
  '#facc15', // yellow
  '#a855f7', // vivid purple
  '#14b8a6', // teal-2
  '#f97316', // orange (distinct from admin)
  '#22c55e', // green-2
  '#3b82f6', // blue-2
  '#ef4444', // red-2
  '#22d3ee', // cyan-2
];

export const DEFAULT_USER_COLOR = '#94a3b8';
export const MIN_COLOR_DISTANCE = 110;

const HEX_RE = /^#?([0-9a-f]{6})$/i;

export function normalizeHex(color: string): string | null {
  const match = HEX_RE.exec(color.trim());
  if (!match) return null;
  return `#${match[1].toLowerCase()}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const value = normalized.slice(1);
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return { r, g, b };
}

export function rgbDistance(a: string, b: string): number {
  const rgbA = hexToRgb(a);
  const rgbB = hexToRgb(b);
  if (!rgbA || !rgbB) return 0;
  const dr = rgbA.r - rgbB.r;
  const dg = rgbA.g - rgbB.g;
  const db = rgbA.b - rgbB.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export function isDistinctColor(color: string, used: Set<string>, minDistance = MIN_COLOR_DISTANCE) {
  const normalized = normalizeHex(color);
  if (!normalized) return false;
  for (const item of used) {
    const target = normalizeHex(item);
    if (!target) continue;
    if (rgbDistance(normalized, target) < minDistance) {
      return false;
    }
  }
  return true;
}

const hslToHex = (h: number, s: number, l: number) => {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const hh = h / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;

  if (hh >= 0 && hh < 1) [r, g, b] = [c, x, 0];
  else if (hh >= 1 && hh < 2) [r, g, b] = [x, c, 0];
  else if (hh >= 2 && hh < 3) [r, g, b] = [0, c, x];
  else if (hh >= 3 && hh < 4) [r, g, b] = [0, x, c];
  else if (hh >= 4 && hh < 5) [r, g, b] = [x, 0, c];
  else if (hh >= 5 && hh < 6) [r, g, b] = [c, 0, x];

  const m = light - c / 2;
  const toHex = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const minDistanceToSet = (color: string, used: Set<string>) => {
  let min = Number.POSITIVE_INFINITY;
  for (const item of used) {
    const target = normalizeHex(item);
    if (!target) continue;
    const dist = rgbDistance(color, target);
    if (dist < min) min = dist;
  }
  return Number.isFinite(min) ? min : 999;
};

const buildCandidates = () => {
  const candidates = new Set<string>(PALETTE);
  const lightnessSteps = [45, 55, 65];
  for (let hue = 0; hue < 360; hue += 15) {
    for (const light of lightnessSteps) {
      candidates.add(hslToHex(hue, 72, light));
    }
  }
  return Array.from(candidates);
};

const findDistinctColor = (used: Set<string>, minDistance: number) => {
  const normalizedUsed = new Set(
    Array.from(used)
      .map((color) => normalizeHex(color))
      .filter((color): color is string => Boolean(color))
  );
  const adminNormalized = normalizeHex(ADMIN_COLOR);
  if (adminNormalized) {
    normalizedUsed.add(adminNormalized);
  }

  for (const color of buildCandidates()) {
    if (isDistinctColor(color, normalizedUsed, minDistance)) {
      return color;
    }
  }

  return null;
};

export function pickUniqueColor(used: Set<string>, minDistance = MIN_COLOR_DISTANCE) {
  const distinct = findDistinctColor(used, minDistance);
  if (distinct) {
    return distinct;
  }

  const normalizedUsed = new Set(
    Array.from(used)
      .map((color) => normalizeHex(color))
      .filter((color): color is string => Boolean(color))
  );
  const adminNormalized = normalizeHex(ADMIN_COLOR);
  if (adminNormalized) {
    normalizedUsed.add(adminNormalized);
  }

  let bestColor = DEFAULT_USER_COLOR;
  let bestDistance = -1;
  for (const color of buildCandidates()) {
    const distance = minDistanceToSet(color, normalizedUsed);
    if (distance > bestDistance) {
      bestDistance = distance;
      bestColor = color;
    }
  }
  return bestColor;
}
