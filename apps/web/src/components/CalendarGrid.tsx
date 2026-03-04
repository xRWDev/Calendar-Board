import React from 'react';
import styled from 'styled-components';
import type { Holiday, Task } from '@calendar/shared';
import { toDateKey } from '@calendar/shared';
import { DayCell } from './DayCell';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ScrollArea = styled.div`
  overflow-x: auto;
  padding-bottom: 8px;
`;

const WeekHeader = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  min-width: 980px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.72rem;

  @media (max-width: 768px) {
    min-width: 720px;
    font-size: 0.65rem;
    gap: 6px;
  }
`;

const WeekDay = styled.div`
  text-align: center;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
  min-width: 980px;

  @media (max-width: 768px) {
    min-width: 720px;
    gap: 8px;
  }
`;

interface CalendarGridProps {
  days: Date[];
  currentMonthIndex: number;
  todayKey: string;
  focusDateKey: string | null;
  tasksByDate: Record<string, Task[]>;
  holidaysByDate: Record<string, Holiday[]>;
  query: string;
  onCreate: (dateKey: string, title: string) => void;
  onUpdate: (id: string, updates: { title?: string; notes?: string }) => void;
  onDelete: (id: string) => void;
}

const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CalendarGrid({
  days,
  currentMonthIndex,
  todayKey,
  focusDateKey,
  tasksByDate,
  holidaysByDate,
  query,
  onCreate,
  onUpdate,
  onDelete,
}: CalendarGridProps) {
  return (
    <Wrapper>
      <ScrollArea>
        <WeekHeader>
          {weekLabels.map((label) => (
            <WeekDay key={label}>{label}</WeekDay>
          ))}
        </WeekHeader>
        <Grid>
          {days.map((day) => {
            const dateKey = toDateKey(day);
            const hasMatch = query.length > 0 && (tasksByDate[dateKey]?.length ?? 0) > 0;
            return (
              <DayCell
                key={dateKey}
                date={day}
                dateKey={dateKey}
                isCurrentMonth={day.getMonth() === currentMonthIndex}
                isToday={dateKey === todayKey}
                highlightActive={hasMatch || dateKey === focusDateKey}
                maxVisible={2}
                tasks={tasksByDate[dateKey] ?? []}
                holidays={holidaysByDate[dateKey] ?? []}
                query={query}
                onCreate={onCreate}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            );
          })}
        </Grid>
      </ScrollArea>
    </Wrapper>
  );
}
