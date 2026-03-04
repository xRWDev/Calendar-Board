export type DateKey = string; // YYYY-MM-DD

export interface Task {
  id: string;
  title: string;
  notes?: string;
  date: DateKey;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCreateInput {
  title: string;
  notes?: string;
  date: DateKey;
}

export interface TaskUpdateInput {
  title?: string;
  notes?: string;
  date?: DateKey;
  order?: number;
}

export interface TaskReorderUpdate {
  id: string;
  date: DateKey;
  order: number;
}

export interface Holiday {
  date: DateKey;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties?: string[];
  launchYear?: number;
  types: string[];
}

export interface Country {
  countryCode: string;
  name: string;
}
