import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Holiday, Task } from '@calendar/shared';
import { TaskItem } from './TaskItem';

const Cell = styled.div<{
  $muted: boolean;
  $over: boolean;
  $highlight: boolean;
}>`
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 10px;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  background: ${(props) => (props.$muted ? 'rgba(255,255,255,0.6)' : 'var(--surface)')};
  box-shadow: ${(props) =>
    props.$over
      ? '0 0 0 2px rgba(47, 128, 237, 0.3)'
      : '0 0 0 2px rgba(255, 122, 69, 0)'};
  transition: box-shadow 0.25s ease, background 0.25s ease, transform 0.25s ease;
  ${(props) =>
    props.$highlight &&
    `
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
      transform: translateY(-2px);
    `}
  @media (max-width: 768px) {
    min-height: 120px;
    padding: 8px;
    border-radius: 14px;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
`;

const DayNumber = styled.div<{ $muted: boolean; $today: boolean }>`
  font-size: 0.9rem;
  color: ${(props) => (props.$muted ? 'var(--soft)' : 'var(--ink)')};
  background: ${(props) => (props.$today ? 'rgba(47, 128, 237, 0.15)' : 'transparent')};
  border: ${(props) => (props.$today ? '1px solid rgba(47, 128, 237, 0.5)' : 'none')};
  padding: ${(props) => (props.$today ? '2px 8px' : '0')};
  border-radius: 999px;

  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

const HolidayList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const HolidayTag = styled.div`
  font-size: 0.7rem;
  color: var(--holiday);
  background: rgba(124, 58, 237, 0.1);
  padding: 2px 6px;
  border-radius: 6px;
  line-height: 1.2;

  @media (max-width: 768px) {
    font-size: 0.65rem;
  }
`;

const Tasks = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;

  @media (max-width: 768px) {
    gap: 4px;
  }
`;

const OverflowPill = styled.button`
  border: none;
  align-self: flex-start;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  color: var(--muted);
  font-size: 0.75rem;
  cursor: pointer;

  @media (max-width: 768px) {
    font-size: 0.7rem;
    padding: 3px 8px;
  }
`;

const PopoverCard = styled.div<{ $top: number; $left: number; $open: boolean }>`
  position: fixed;
  top: ${(props) => props.$top}px;
  left: ${(props) => props.$left}px;
  width: min(340px, 92vw);
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 16px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(12px);
  z-index: 50;
  opacity: ${(props) => (props.$open ? 1 : 0)};
  transform: ${(props) => (props.$open ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.98)')};
  filter: ${(props) => (props.$open ? 'blur(0)' : 'blur(8px)')};
  transition: opacity 240ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 300ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 300ms cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: ${(props) => (props.$open ? 'auto' : 'none')};
  transform-origin: center;
  will-change: transform, opacity, filter;
`;

const OverflowHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ink);
  padding: 2px 6px;
`;

const OverflowList = styled.div`
  --row-size: 56px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
  padding: 8px;
  max-height: calc(var(--row-size) * 5);
  background: rgba(248, 250, 252, 0.9);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 14px;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.6);
    border-radius: 999px;
  }
`;

const OverflowClose = styled.button`
  border: none;
  background: #f1f5f9;
  color: #64748b;
  border-radius: 999px;
  width: 26px;
  height: 26px;
  cursor: pointer;
  display: grid;
  place-items: center;
`;

const AddButton = styled.button`
  border: none;
  background: rgba(255, 122, 69, 0.1);
  color: var(--accent);
  border-radius: 10px;
  padding: 4px 8px;
  font-weight: 600;
  cursor: pointer;
  align-self: flex-start;

  @media (max-width: 768px) {
    padding: 3px 7px;
    font-size: 0.85rem;
  }
`;

const inputIn = keyframes`
  0% {
    opacity: 0;
    transform: translateY(6px) scale(0.98);
    filter: blur(6px);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
`;

const AddComposer = styled.div`
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 14px;
  padding: 10px;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  gap: 6px;
  animation: ${inputIn} 220ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
  will-change: transform, opacity, filter;
  z-index: 3;

  @media (max-width: 768px) {
    position: static;
    background: transparent;
    border: none;
    box-shadow: none;
    padding: 0;
    backdrop-filter: none;
  }
`;

const AddTextarea = styled.textarea`
  width: 100%;
  min-height: 68px;
  max-height: 160px;
  resize: none;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 0.85rem;
  line-height: 1.3;
  font-family: inherit;
  background: #fff;

  @media (max-width: 768px) {
    min-height: 36px;
    max-height: 80px;
    font-size: 0.8rem;
  }
`;

const AddHint = styled.div`
  font-size: 0.7rem;
  color: var(--muted);
  text-align: right;

  @media (max-width: 768px) {
    display: none;
  }
`;

interface DayCellProps {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  highlightActive: boolean;
  maxVisible: number;
  tasks: Task[];
  holidays: Holiday[];
  query: string;
  onCreate: (dateKey: string, title: string) => void;
  onUpdate: (id: string, updates: { title?: string; notes?: string }) => void;
  onDelete: (id: string) => void;
}

export const DayCell = React.memo(function DayCell({
  date,
  dateKey,
  isCurrentMonth,
  isToday,
  highlightActive,
  maxVisible,
  tasks,
  holidays,
  query,
  onCreate,
  onUpdate,
  onDelete,
}: DayCellProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [showOverflow, setShowOverflow] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const cellRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const addComposerRef = useRef<HTMLDivElement | null>(null);
  const addTextRef = useRef<HTMLTextAreaElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const { setNodeRef, isOver } = useDroppable({ id: dateKey });
  const visibleTasks = tasks.slice(0, maxVisible);
  const overflowTasks = tasks.slice(maxVisible);

  const holidayTags = useMemo(() => {
    if (!holidays || holidays.length === 0) return null;
    const maxVisible = 2;
    const visible = holidays.slice(0, maxVisible);
    const extra = holidays.length - visible.length;
    const extraNames = holidays.map((holiday) => holiday.name).join(', ');
    return (
      <HolidayList>
        {visible.map((holiday) => (
          <HolidayTag key={`${holiday.date}-${holiday.name}`}>{holiday.name}</HolidayTag>
        ))}
        {extra > 0 ? (
          <HolidayTag title={extraNames}>+{extra} more</HolidayTag>
        ) : null}
      </HolidayList>
    );
  }, [holidays]);

  const handleAdd = () => {
    setIsAdding(true);
  };

  const handleAddKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const title = draft.trim().replace(/\s+/g, ' ');
      if (!title) return;
      onCreate(dateKey, title);
      setDraft('');
      setIsAdding(false);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setDraft('');
      setIsAdding(false);
    }
  };

  useEffect(() => {
    if (!isAdding) return;
    if (addTextRef.current) {
      addTextRef.current.style.height = 'auto';
      addTextRef.current.style.height = `${addTextRef.current.scrollHeight}px`;
    }
    const handleClick = (event: MouseEvent) => {
      if (!addComposerRef.current) return;
      if (addComposerRef.current.contains(event.target as Node)) return;
      setDraft('');
      setIsAdding(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isAdding]);

  const handleTasksClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleAdd();
    }
  };

  const openOverflow = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setPopoverOpen(false);
    setPopoverPos(null);
    setShowOverflow(true);
  };

  const closeOverflow = (instant = false) => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setPopoverOpen(false);
    if (instant) {
      setShowOverflow(false);
      setPopoverPos(null);
      return;
    }
    closeTimerRef.current = window.setTimeout(() => {
      setShowOverflow(false);
      setPopoverPos(null);
    }, 260);
  };

  useEffect(() => {
    if (!showOverflow) return;
    const updatePosition = () => {
      if (!cellRef.current || !modalRef.current) return;
      const rect = cellRef.current.getBoundingClientRect();
      const cardRect = modalRef.current.getBoundingClientRect();
      const gutter = 12;
      let top = rect.bottom + gutter;
      let left = rect.left + rect.width / 2 - cardRect.width / 2;
      if (top + cardRect.height > window.innerHeight - gutter) {
        top = rect.top - cardRect.height - gutter;
      }
      if (top < gutter) top = gutter;
      left = Math.min(Math.max(gutter, left), window.innerWidth - cardRect.width - gutter);
      setPopoverPos({ top, left });
    };
    const rafUpdate = () => window.requestAnimationFrame(updatePosition);
    rafUpdate();
    const handleClick = (event: MouseEvent) => {
      if (!modalRef.current) return;
      if (!modalRef.current.contains(event.target as Node)) {
        closeOverflow();
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeOverflow();
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('resize', rafUpdate);
    window.addEventListener('scroll', rafUpdate, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', rafUpdate);
      window.removeEventListener('scroll', rafUpdate, true);
    };
  }, [showOverflow]);

  useEffect(() => {
    if (!showOverflow) return;
    if (!popoverPos) return;
    const raf = window.requestAnimationFrame(() => setPopoverOpen(true));
    return () => window.cancelAnimationFrame(raf);
  }, [showOverflow, popoverPos]);

  useEffect(() => {
    const handleDndStart = () => {
      closeOverflow(true);
    };
    window.addEventListener('calendar-dnd-start', handleDndStart);
    return () => {
      window.removeEventListener('calendar-dnd-start', handleDndStart);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  return (
    <Cell
      ref={(node) => {
        setNodeRef(node);
        cellRef.current = node;
      }}
      $muted={!isCurrentMonth}
      $over={isOver}
      $highlight={highlightActive}
      data-date={dateKey}
    >
      <Header>
        <DayNumber $muted={!isCurrentMonth} $today={isToday}>
          {date.getDate()}
        </DayNumber>
        <AddButton type="button" onClick={handleAdd}>
          +
        </AddButton>
      </Header>
      {holidayTags}
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <Tasks onClick={handleTasksClick}>
          {visibleTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              query={query}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
          {overflowTasks.length > 0 ? (
            <OverflowPill
              type="button"
              onClick={() => {
                if (showOverflow) {
                  closeOverflow();
                } else {
                  openOverflow();
                }
              }}
            >
              +{overflowTasks.length} more
            </OverflowPill>
          ) : null}
        </Tasks>
      </SortableContext>
      {isAdding ? (
        <AddComposer ref={addComposerRef}>
          <AddTextarea
            ref={addTextRef}
            placeholder="New task"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              const target = event.target;
              target.style.height = 'auto';
              target.style.height = `${target.scrollHeight}px`;
            }}
            onKeyDown={handleAddKeyDown}
            autoFocus
          />
          <AddHint>Enter to save · Shift+Enter for new line · Esc to cancel</AddHint>
        </AddComposer>
      ) : null}
      {showOverflow
        ? createPortal(
            <PopoverCard
              ref={modalRef}
              $top={popoverPos?.top ?? 0}
              $left={popoverPos?.left ?? 0}
              $open={popoverOpen}
            >
              <OverflowHeader>
                More tasks
                <OverflowClose
                  type="button"
                  onClick={() => closeOverflow()}
                  aria-label="Close"
                >
                  ×
                </OverflowClose>
              </OverflowHeader>
              <SortableContext
                items={overflowTasks.map((task) => task.id)}
                strategy={verticalListSortingStrategy}
              >
                <OverflowList>
                  {overflowTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      query={query}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                      variant="popover"
                    />
                  ))}
                </OverflowList>
              </SortableContext>
            </PopoverCard>,
            document.body
          )
        : null}
    </Cell>
  );
});
