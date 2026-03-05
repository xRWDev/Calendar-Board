import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { Country, Task, TaskReorderUpdate } from '@calendar/shared';
import { buildMonthGrid, getMonthLabel, startOfMonth, toDateKey } from '@calendar/shared';
import { CalendarGrid } from './components/CalendarGrid';
import { CountrySelect } from './components/CountrySelect';
import { createTask, deleteTask, fetchTasks, reorderTasks, updateTask } from './api';
import { normalizeTasks } from './utils/tasks';
import { useHolidays } from './hooks/useHolidays';

const Page = styled.div`
  padding: 32px 28px 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;

  @media (max-width: 768px) {
    padding: 16px 12px 96px;
    gap: 16px;
  }
`;

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 12px;
  z-index: 20;
  margin-bottom: 12px;
`;

const HeaderTop = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: space-between;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.4rem;
  font-weight: 600;

  @media (max-width: 768px) {
    font-size: 1.15rem;
    justify-content: space-between;
  }
`;

const BrandBadge = styled.span`
  background: var(--accent);
  color: white;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: 600;
`;

const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;

  @media (max-width: 768px) {
    flex-wrap: wrap;
  }
`;

const Button = styled.button<{ $primary?: boolean }>`
  border: none;
  border-radius: 12px;
  padding: 8px 12px;
  background: ${(props) => (props.$primary ? 'var(--accent)' : 'var(--surface)')};
  color: ${(props) => (props.$primary ? '#fff' : 'var(--ink)')};
  box-shadow: var(--shadow);
  cursor: pointer;
  font-weight: 600;

  @media (max-width: 768px) {
    padding: 6px 10px;
    font-size: 0.85rem;
  }
`;

const MonthLabel = styled.div`
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.2rem;
  font-weight: 600;
  background: rgba(255, 122, 69, 0.12);
  border: 1px solid rgba(255, 122, 69, 0.35);
  color: var(--ink);
  padding: 6px 14px;
  border-radius: 999px;
  box-shadow: 0 8px 18px rgba(255, 122, 69, 0.12);
  justify-self: center;

  @media (max-width: 768px) {
    align-self: center;
    font-size: 1rem;
  }
`;

const SearchInput = styled.input`
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 8px 12px;
  min-width: 220px;

  @media (max-width: 768px) {
    width: 100%;
    min-width: auto;
  }
`;

const ErrorBanner = styled.div`
  background: #fee2e2;
  color: #b91c1c;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 0.9rem;
`;

const DragPreview = styled.div<{ $width?: number | null }>`
  padding: 8px 10px;
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
  font-size: 0.9rem;
  width: ${(props) => (props.$width ? `${props.$width}px` : 'auto')};
  max-width: ${(props) => (props.$width ? `${props.$width}px` : '280px')};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: width 180ms ease, transform 180ms ease, box-shadow 180ms ease;
  pointer-events: none;
`;

const slideInNext = keyframes`
  from {
    opacity: 0;
    transform: translateX(24px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const slideInPrev = keyframes`
  from {
    opacity: 0;
    transform: translateX(-24px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const CalendarSlide = styled.div<{ $dir: 'prev' | 'next' | 'none' }>`
  animation: ${(props) =>
      props.$dir === 'prev' ? slideInPrev : props.$dir === 'next' ? slideInNext : 'none'}
    260ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform, opacity;
`;

const FooterRow = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  @media (max-width: 768px) {
    gap: 10px;
  }
`;

const DesktopNav = styled(ButtonGroup)`
  @media (max-width: 768px) {
    display: none;
  }
`;

const MonthBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
`;

const MobileNav = styled.div`
  display: none;

  @media (max-width: 768px) {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: 12px;
    z-index: 40;
    display: flex;
    justify-content: center;
    pointer-events: none;
  }
`;

const MobileNavInner = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(227, 230, 240, 0.8);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(10px);
  pointer-events: auto;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 8px;

  @media (max-width: 768px) {
    gap: 12px;
  }
`;

const API_BASE = 'https://date.nager.at/api/v3';

export default function App() {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(today), [today]);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today));
  const [monthDirection, setMonthDirection] = useState<'prev' | 'next' | 'none'>('none');
  const [tasksByDate, setTasksByDate] = useState<Record<string, Task[]>>({});
  const [search, setSearch] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [countryCode, setCountryCode] = useState('US');
  const [error, setError] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeContainerId, setActiveContainerId] = useState<string | null>(null);
  const [dragPreviewWidth, setDragPreviewWidth] = useState<number | null>(null);
  const dragSnapshotRef = useRef<Record<string, Task[]> | null>(null);
  const [focusDateKey, setFocusDateKey] = useState<string | null>(null);
  const pendingScrollRef = useRef<string | null>(null);
  const focusTimerRef = useRef<number | null>(null);

  const grid = useMemo(() => buildMonthGrid(currentMonth, 1), [currentMonth]);
  const dateKeys = useMemo(() => grid.days.map((day) => toDateKey(day)), [grid.days]);
  const monthKey = useMemo(
    () => `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`,
    [currentMonth]
  );

  const { holidayMap, error: holidayError } = useHolidays(
    currentMonth.getFullYear(),
    countryCode
  );

  const normalizedQuery = search.trim().toLowerCase();
  const isFiltering = normalizedQuery.length > 0;
  const matchesQuery = useCallback((task: Task) => {
    if (!isFiltering) return true;
    const haystack = `${task.title} ${task.notes ?? ''}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  }, [isFiltering, normalizedQuery]);

  const visibleTasksByDate = useMemo(() => {
    if (!isFiltering) return tasksByDate;
    const filtered: Record<string, Task[]> = {};
    Object.entries(tasksByDate).forEach(([date, tasks]) => {
      filtered[date] = tasks.filter(matchesQuery);
    });
    return filtered;
  }, [tasksByDate, isFiltering, normalizedQuery, matchesQuery]);

  useEffect(() => {
    if (!isFiltering) return;
    const matchKey = grid.days
      .map((day) => toDateKey(day))
      .find((key) => tasksByDate[key]?.some(matchesQuery));
    if (!matchKey) {
      return;
    }
    const element = document.querySelector(`[data-date="${matchKey}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    } else {
      pendingScrollRef.current = matchKey;
    }
  }, [isFiltering, normalizedQuery, tasksByDate, grid.days, matchesQuery]);

  useEffect(() => {
    const key = pendingScrollRef.current;
    if (!key) return;
    const element = document.querySelector(`[data-date="${key}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      pendingScrollRef.current = null;
    }
  }, [grid.days]);

  const focusDate = (dateKey: string) => {
    setFocusDateKey(dateKey);
    const element = document.querySelector(`[data-date="${dateKey}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    } else {
      pendingScrollRef.current = dateKey;
    }
    if (focusTimerRef.current) {
      window.clearTimeout(focusTimerRef.current);
    }
    focusTimerRef.current = window.setTimeout(() => {
      setFocusDateKey(null);
    }, 900);
  };

  const changeMonth = (nextMonth: Date, direction: 'prev' | 'next' | 'none') => {
    setMonthDirection(direction);
    setCurrentMonth(startOfMonth(nextMonth));
  };

  useEffect(() => {
    return () => {
      if (focusTimerRef.current) {
        window.clearTimeout(focusTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setTasksByDate(() => {
      const empty: Record<string, Task[]> = {};
      dateKeys.forEach((key) => {
        empty[key] = [];
      });
      return empty;
    });
  }, [dateKeys]);

  useEffect(() => {
    let active = true;
    fetchTasks(toDateKey(grid.start), toDateKey(grid.end))
      .then((tasks) => {
        if (!active) return;
        setTasksByDate(normalizeTasks(tasks, dateKeys));
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load tasks');
      })
      .finally(() => {
        if (!active) return;
      });

    return () => {
      active = false;
    };
  }, [grid.start, grid.end, dateKeys]);

  useEffect(() => {
    let active = true;
    fetch(`${API_BASE}/AvailableCountries`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load countries');
        return (await res.json()) as Country[];
      })
      .then((data) => {
        if (!active) return;
        setCountries(data);
        if (!data.find((country) => country.countryCode === countryCode)) {
          setCountryCode(data[0]?.countryCode ?? 'US');
        }
      })
      .catch(() => {
        if (!active) return;
        setCountries([{ countryCode: 'US', name: 'United States' }]);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const findContainer = (id: string): string | null => {
    if (tasksByDate[id]) return id;
    for (const [date, tasks] of Object.entries(tasksByDate)) {
      if (tasks.find((task) => task.id === id)) return date;
    }
    return null;
  };

  const findTask = (id: string | null): Task | null => {
    if (!id) return null;
    for (const tasks of Object.values(tasksByDate)) {
      const task = tasks.find((item) => item.id === id);
      if (task) return task;
    }
    return null;
  };

  const cloneTasksMap = (map: Record<string, Task[]>) => {
    const cloned: Record<string, Task[]> = {};
    Object.entries(map).forEach(([date, tasks]) => {
      cloned[date] = [...tasks];
    });
    return cloned;
  };

  const getCellWidth = (dateKey: string) => {
    const cell = document.querySelector(`[data-date="${dateKey}"]`) as HTMLElement | null;
    if (!cell) return null;
    const rect = cell.getBoundingClientRect();
    return Math.max(140, rect.width - 24);
  };

  const reorderVisibleTasks = (
    allTasks: Task[],
    activeId: string,
    overId: string,
    containerId: string
  ) => {
    const visible = allTasks.filter(matchesQuery);
    const fromIndex = visible.findIndex((task) => task.id === activeId);
    if (fromIndex === -1) return allTasks;
    const toIndex =
      overId === containerId ? visible.length - 1 : visible.findIndex((task) => task.id === overId);
    if (toIndex === -1 || fromIndex === toIndex) return allTasks;

    const reorderedVisible = arrayMove(visible, fromIndex, toIndex);
    const visibleIndices: number[] = [];
    allTasks.forEach((task, index) => {
      if (matchesQuery(task)) visibleIndices.push(index);
    });

    const nextAll = [...allTasks];
    reorderedVisible.forEach((task, index) => {
      nextAll[visibleIndices[index]] = task;
    });
    return nextAll;
  };

  const moveTaskAcrossDates = (
    fromTasks: Task[],
    toTasks: Task[],
    activeId: string,
    targetDate: string,
    overId: string
  ) => {
    const fromIndex = fromTasks.findIndex((task) => task.id === activeId);
    if (fromIndex === -1) {
      return { nextFrom: fromTasks, nextTo: toTasks };
    }
    const task = fromTasks[fromIndex];
    const nextFrom = [...fromTasks.slice(0, fromIndex), ...fromTasks.slice(fromIndex + 1)];
    const insertIndex =
      overId === targetDate ? toTasks.length : toTasks.findIndex((t) => t.id === overId);
    const nextTo = [...toTasks];
    const safeIndex = insertIndex < 0 ? nextTo.length : insertIndex;
    nextTo.splice(safeIndex, 0, { ...task, date: targetDate });
    return { nextFrom, nextTo };
  };

  const handleDragStart = (event: DragStartEvent) => {
    window.dispatchEvent(new Event('calendar-dnd-start'));
    const activeId = String(event.active.id);
    setActiveTaskId(activeId);
    setActiveContainerId(findContainer(activeId));
    dragSnapshotRef.current = cloneTasksMap(tasksByDate);
    const activeNode = document.querySelector(`[data-task-id="${activeId}"]`) as HTMLElement | null;
    if (activeNode) {
      setDragPreviewWidth(activeNode.getBoundingClientRect().width);
      return;
    }
    const container = findContainer(activeId);
    if (container) {
      const width = getCellWidth(container);
      if (width) setDragPreviewWidth(width);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) return;

    if (activeContainer === overContainer) {
      setTasksByDate((prev) => {
        const current = prev[activeContainer] ?? [];
        const nextForDate = reorderVisibleTasks(current, activeId, overId, overContainer);
        if (nextForDate === current) return prev;
        return { ...prev, [activeContainer]: nextForDate };
      });
      const width = getCellWidth(overContainer);
      if (width) setDragPreviewWidth(width);
      return;
    }

    setTasksByDate((prev) => {
      const fromTasks = prev[activeContainer] ?? [];
      const toTasks = prev[overContainer] ?? [];
      const { nextFrom, nextTo } = moveTaskAcrossDates(
        fromTasks,
        toTasks,
        activeId,
        overContainer,
        overId
      );
      if (nextFrom === fromTasks && nextTo === toTasks) return prev;
      return { ...prev, [activeContainer]: nextFrom, [overContainer]: nextTo };
    });
    const width = getCellWidth(overContainer);
    if (width) setDragPreviewWidth(width);
  };

  const persistReorder = async (updates: TaskReorderUpdate[]) => {
    if (updates.length === 0) return;
    try {
      await reorderTasks(updates);
    } catch (err) {
      setError('Failed to save order. Reloading…');
      fetchTasks(toDateKey(grid.start), toDateKey(grid.end))
        .then((tasks) => setTasksByDate(normalizeTasks(tasks, dateKeys)))
        .catch(() => undefined);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTaskId(null);
    setActiveContainerId(null);
    setDragPreviewWidth(null);
    if (!over) {
      if (dragSnapshotRef.current) {
        setTasksByDate(dragSnapshotRef.current);
        dragSnapshotRef.current = null;
      }
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeContainer = activeContainerId ?? findContainer(activeId);
    const overContainer = findContainer(overId);
    if (!activeContainer || !overContainer) return;

    const affected = new Set([activeContainer, overContainer]);
    const updates: TaskReorderUpdate[] = [];

    setTasksByDate((prev) => {
      const next = { ...prev };
      affected.forEach((date) => {
        const tasks = next[date] ?? [];
        next[date] = tasks.map((task, index) => {
          if (task.order !== index || task.date !== date) {
            updates.push({ id: task.id, date, order: index });
            return { ...task, date, order: index };
          }
          return task;
        });
      });
      return next;
    });

    persistReorder(updates);
    dragSnapshotRef.current = null;
  };

  const handleDragCancel = () => {
    setActiveTaskId(null);
    setActiveContainerId(null);
    setDragPreviewWidth(null);
    if (dragSnapshotRef.current) {
      setTasksByDate(dragSnapshotRef.current);
      dragSnapshotRef.current = null;
    }
  };

  const handleCreate = async (dateKey: string, title: string) => {
    const tempId = `temp-${Date.now()}`;
    const previous = tasksByDate;
    setTasksByDate((prev) => {
      const next = { ...prev };
      const tasks = next[dateKey] ?? [];
      const tempTask: Task = {
        id: tempId,
        clientId: tempId,
        title,
        notes: undefined,
        date: dateKey,
        order: tasks.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      next[dateKey] = [...tasks, tempTask];
      return next;
    });

    try {
      const created = await createTask({ title, date: dateKey });
      setTasksByDate((prev) => {
        const next = { ...prev };
        next[dateKey] = (next[dateKey] ?? []).map((task) =>
          task.id === tempId ? { ...created, clientId: task.clientId ?? tempId } : task
        );
        return next;
      });
    } catch (err) {
      setError('Failed to create task');
      setTasksByDate(previous);
    }
  };

  const handleUpdate = async (id: string, updates: { title?: string; notes?: string }) => {
    const existing = findTask(id);
    const previous = tasksByDate;
    setTasksByDate((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((date) => {
        next[date] = next[date].map((task) => (task.id === id ? { ...task, ...updates } : task));
      });
      return next;
    });

    try {
      const updated = await updateTask(id, updates);
      setTasksByDate((prev) => {
        const next = { ...prev };
        next[updated.date] = (next[updated.date] ?? []).map((task) =>
          task.id === updated.id
            ? { ...updated, clientId: existing?.clientId ?? updated.id }
            : task
        );
        return next;
      });
    } catch (err) {
      setError('Failed to update task');
      setTasksByDate(previous);
    }
  };

  const handleDelete = async (id: string) => {
    const previous = tasksByDate;
    setTasksByDate((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((date) => {
        next[date] = next[date].filter((task) => task.id !== id);
      });
      return next;
    });

    try {
      await deleteTask(id);
    } catch (err) {
      setError('Failed to delete task');
      setTasksByDate(previous);
    }
  };

  const activeTask = findTask(activeTaskId);

  return (
    <Page>
      <Header>
        <HeaderTop>
          <Brand>
            Calendar Board <BrandBadge>Mini Trello</BrandBadge>
          </Brand>
          <Controls>
            <SearchInput
              placeholder="Search tasks"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <CountrySelect
              value={countryCode}
              options={countries}
              onChange={(next) => setCountryCode(next)}
            />
          </Controls>
        </HeaderTop>
        <FooterRow>
          <MonthBlock>
            <MonthLabel>{getMonthLabel(currentMonth)}</MonthLabel>
            <DesktopNav>
              <Button
                type="button"
                onClick={() =>
                  changeMonth(
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1),
                    'prev'
                  )
                }
              >
                Prev
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const target = startOfMonth(today);
                  if (
                    target.getFullYear() === currentMonth.getFullYear() &&
                    target.getMonth() === currentMonth.getMonth()
                  ) {
                    setMonthDirection('none');
                  } else if (
                    target.getFullYear() > currentMonth.getFullYear() ||
                    (target.getFullYear() === currentMonth.getFullYear() &&
                      target.getMonth() > currentMonth.getMonth())
                  ) {
                    setMonthDirection('next');
                  } else {
                    setMonthDirection('prev');
                  }
                  setCurrentMonth(target);
                  focusDate(todayKey);
                }}
                $primary
              >
                Today
              </Button>
              <Button
                type="button"
                onClick={() =>
                  changeMonth(
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
                    'next'
                  )
                }
              >
                Next
              </Button>
            </DesktopNav>
          </MonthBlock>
        </FooterRow>
      </Header>

      <Content>
        {holidayError ? <ErrorBanner>Holidays unavailable.</ErrorBanner> : null}
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <CalendarSlide key={monthKey} $dir={monthDirection}>
            <CalendarGrid
              days={grid.days}
              currentMonthIndex={currentMonth.getMonth()}
              todayKey={todayKey}
              focusDateKey={focusDateKey}
              tasksByDate={visibleTasksByDate}
              holidaysByDate={holidayMap}
              query={normalizedQuery}
              onCreate={handleCreate}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          </CalendarSlide>
          <DragOverlay>
            {activeTask ? (
              <DragPreview $width={dragPreviewWidth}>{activeTask.title}</DragPreview>
            ) : null}
          </DragOverlay>
        </DndContext>
      </Content>

      <MobileNav>
        <MobileNavInner>
          <Button
            type="button"
            onClick={() =>
              changeMonth(
                new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1),
                'prev'
              )
            }
          >
            Prev
          </Button>
          <Button
            type="button"
            onClick={() => {
              const target = startOfMonth(today);
              if (
                target.getFullYear() === currentMonth.getFullYear() &&
                target.getMonth() === currentMonth.getMonth()
              ) {
                setMonthDirection('none');
              } else if (
                target.getFullYear() > currentMonth.getFullYear() ||
                (target.getFullYear() === currentMonth.getFullYear() &&
                  target.getMonth() > currentMonth.getMonth())
              ) {
                setMonthDirection('next');
              } else {
                setMonthDirection('prev');
              }
              setCurrentMonth(target);
              focusDate(todayKey);
            }}
            $primary
          >
            Today
          </Button>
          <Button
            type="button"
            onClick={() =>
              changeMonth(
                new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
                'next'
              )
            }
          >
            Next
          </Button>
        </MobileNavInner>
      </MobileNav>
    </Page>
  );
}
