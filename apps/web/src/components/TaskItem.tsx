import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '@calendar/shared';
import { highlightText } from '../utils/highlight';

const taskIn = keyframes`
  0% {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
    filter: blur(8px);
  }
  60% {
    opacity: 1;
    transform: translateY(-2px) scale(1.01);
    filter: blur(2px);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
`;

const taskOut = keyframes`
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-6px) scale(0.97);
    filter: blur(10px);
  }
`;


const toRgba = (color: string, alpha: number) => {
  const value = color.replace('#', '').trim();
  if (value.length === 3) {
    const r = Number.parseInt(value[0] + value[0], 16);
    const g = Number.parseInt(value[1] + value[1], 16);
    const b = Number.parseInt(value[2] + value[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (value.length === 6) {
    const r = Number.parseInt(value.slice(0, 2), 16);
    const g = Number.parseInt(value.slice(2, 4), 16);
    const b = Number.parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(148, 163, 184, ${alpha})`;
};

const Row = styled.div<{
  $dragging: boolean;
  $disabled: boolean;
  $animate: boolean;
  $removing: boolean;
  $variant: 'default' | 'popover';
  $accent: string;
}>`
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: start;
  padding: ${(props) => (props.$variant === 'popover' ? '10px 12px' : '8px 10px')};
  border-radius: ${(props) => (props.$variant === 'popover' ? '14px' : '12px')};
  background: ${(props) =>
    props.$dragging
      ? '#fef3c7'
      : props.$variant === 'popover'
        ? '#ffffff'
        : 'var(--surface)'};
  box-shadow: ${(props) => {
    const tint = toRgba(props.$accent, props.$dragging ? 0.22 : 0.12);
    if (props.$dragging) {
      return `0 8px 20px rgba(255, 122, 69, 0.2), 0 6px 14px ${tint}`;
    }
    if (props.$variant === 'popover') {
      return `0 6px 16px rgba(15, 23, 42, 0.08), 0 4px 12px ${tint}`;
    }
    return `0 4px 10px ${tint}`;
  }};
  border: 0.8px solid ${(props) => props.$accent};
  transition: box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease;
  opacity: ${(props) => (props.$disabled ? 0.7 : 1)};
  &:hover {
    z-index: 5;
  }
  animation: ${(props) =>
      props.$removing ? taskOut : props.$animate ? taskIn : 'none'}
    240ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
  will-change: transform, opacity, filter;
  pointer-events: ${(props) => (props.$removing ? 'none' : 'auto')};

  @media (max-width: 768px) {
    padding: 6px 8px;
    gap: 6px;
  }

  mark {
    background: rgba(255, 122, 69, 0.2);
    color: inherit;
    border-radius: 6px;
    padding: 0 2px;
  }
`;

const Handle = styled.button<{ $disabled: boolean; $variant: 'default' | 'popover'; $accent: string; $isAdmin: boolean }>`
  width: 18px;
  height: 18px;
  border-radius: 6px;
  border: 0.8px solid ${(props) => props.$accent};
  background: ${(props) =>
    props.$disabled ? '#f3f4f6' : props.$variant === 'popover' ? '#ffffff' : '#ffffff'};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${(props) => (props.$disabled ? 'not-allowed' : 'grab')};
  padding: 0;
  margin-top: 2px;
  line-height: 0;

  @media (max-width: 768px) {
    width: 16px;
    height: 16px;
  }

  &:before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: ${(props) => (props.$disabled ? '#cbd5f5' : props.$accent)};
    opacity: ${(props) => (props.$isAdmin ? 0 : 1)};
    display: ${(props) => (props.$isAdmin ? 'none' : 'block')};
  }
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const CrownIcon = styled.svg<{ $accent: string }>`
  width: 12px;
  height: 12px;
  flex: 0 0 auto;
  display: block;
  fill: ${(props) => props.$accent};
`;

const Title = styled.div`
  font-size: 0.92rem;
  font-weight: 500;
  cursor: text;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;

  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
`;

const Notes = styled.div`
  font-size: 0.78rem;
  color: var(--muted);
  margin-top: 4px;
  line-height: 1.2;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 768px) {
    font-size: 0.7rem;
  }
`;

const EditPopover = styled.div<{
  $top: number;
  $left: number;
  $width: number;
  $open: boolean;
  $accent: string;
}>`
  position: fixed;
  top: ${(props) => props.$top}px;
  left: ${(props) => props.$left}px;
  width: ${(props) => props.$width}px;
  background: rgba(255, 255, 255, 0.94);
  border: 0.8px solid ${(props) => props.$accent};
  border-radius: 16px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.14),
    0 6px 16px ${(props) => toRgba(props.$accent, 0.14)};
  backdrop-filter: blur(14px);
  z-index: 80;
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

const EditTitleArea = styled.textarea<{ $accent: string }>`
  width: 100%;
  min-height: 56px;
  max-height: 160px;
  resize: none;
  border: 0.8px solid ${(props) => props.$accent};
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 0.9rem;
  line-height: 1.3;
  font-family: inherit;
  background: #fff;
`;

const EditNotesArea = styled.textarea<{ $accent: string }>`
  width: 100%;
  min-height: 34px;
  max-height: 120px;
  resize: none;
  border: 0.8px dashed ${(props) => props.$accent};
  border-radius: 10px;
  padding: 6px 10px;
  font-size: 0.78rem;
  line-height: 1.3;
  font-family: inherit;
  color: var(--muted);
  background: #fff;
`;

const EditHint = styled.div`
  font-size: 0.7rem;
  color: var(--muted);
  text-align: right;
`;

const Content = styled.div`
  position: relative;
  width: 100%;
`;

const Tooltip = styled.div<{
  $top: number;
  $left: number;
  $width: number;
  $placement: 'top' | 'bottom';
  $visible: boolean;
  $accent: string;
}>`
  position: fixed;
  top: ${(props) => props.$top}px;
  left: ${(props) => props.$left}px;
  width: ${(props) => props.$width}px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid ${(props) => props.$accent};
  border-radius: 14px;
  padding: 10px 12px;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(12px);
  color: var(--ink);
  font-size: 0.85rem;
  line-height: 1.35;
  opacity: ${(props) => (props.$visible ? 1 : 0)};
  transform: ${(props) =>
    props.$visible
      ? 'translateY(0) scale(1)'
      : `translateY(${props.$placement === 'top' ? '8px' : '-8px'}) scale(0.96)`};
  filter: ${(props) => (props.$visible ? 'blur(0)' : 'blur(8px)')};
  transition: opacity 260ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 340ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 340ms cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
  z-index: 100;
  transform-origin: ${(props) => (props.$placement === 'top' ? 'left bottom' : 'left top')};
  will-change: transform, opacity, filter;
`;

const TooltipTitle = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
  font-size: 0.86rem;
`;

const TooltipBody = styled.div`
  color: var(--muted);
  font-size: 0.8rem;
`;

const DeleteButton = styled.button<{ $variant: 'default' | 'popover' }>`
  border: none;
  background: transparent;
  color: var(--soft);
  font-size: 1rem;
  cursor: pointer;
  padding: 0 4px;
  border-radius: 8px;
  transition: background 0.2s ease, color 0.2s ease;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }

  &:hover {
    color: var(--accent);
    background: ${(props) => (props.$variant === 'popover' ? 'rgba(248, 250, 252, 0.9)' : 'transparent')};
  }
`;

interface TaskItemProps {
  task: Task;
  query: string;
  onUpdate: (id: string, updates: { title?: string; notes?: string }) => void;
  onDelete: (id: string) => void;
  variant?: 'default' | 'popover';
}

export function TaskItem({
  task,
  query,
  onUpdate,
  onDelete,
  variant = 'default',
}: TaskItemProps) {
  const ADMIN_COLOR = '#ff6122';
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? '');
  const [isRemoving, setIsRemoving] = useState(false);
  const deleteTimerRef = useRef<number | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const notesRef = useRef<HTMLTextAreaElement | null>(null);
  const editRef = useRef<HTMLDivElement | null>(null);
  const [renderTooltip, setRenderTooltip] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{
    top: number;
    left: number;
    width: number;
    placement: 'top' | 'bottom';
  } | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const [renderEditor, setRenderEditor] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editPos, setEditPos] = useState<{ top: number; left: number; width: number } | null>(
    null
  );
  const editCloseTimerRef = useRef<number | null>(null);
  const accent = task.isAdmin ? ADMIN_COLOR : task.color ?? '#94a3b8';
  const [animate] = useState(() => {
    const createdAt = Date.parse(task.createdAt);
    if (Number.isNaN(createdAt)) return false;
    return Date.now() - createdAt < 3000;
  });

  const disabled = isEditing || isRemoving;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled,
  });

  const shouldShowTooltip = Boolean(task.notes || task.title.length > 28);

  const updateTooltipPosition = useCallback(() => {
    if (!rowRef.current) return;
    const rect = rowRef.current.getBoundingClientRect();
    const width = Math.min(280, window.innerWidth - 24);
    const height = tooltipRef.current?.offsetHeight ?? 88;
    const gap = 10;
    let left = rect.left;
    left = Math.min(Math.max(12, left), window.innerWidth - width - 12);
    let placement: 'top' | 'bottom' = 'top';
    let top = rect.top - height - gap;
    if (top < 12) {
      placement = 'bottom';
      top = rect.bottom + gap;
    }
    setTooltipPos({ top, left, width, placement });
  }, []);

  useEffect(() => {
    if (!isEditing) {
      setTitle(task.title);
      setNotes(task.notes ?? '');
    }
  }, [task, isEditing]);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) {
        window.clearTimeout(deleteTimerRef.current);
      }
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
      if (showTimerRef.current) {
        window.clearTimeout(showTimerRef.current);
      }
      if (editCloseTimerRef.current) {
        window.clearTimeout(editCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!renderTooltip) return;
    updateTooltipPosition();
    const handleReposition = () => updateTooltipPosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [renderTooltip, updateTooltipPosition]);

  useEffect(() => {
    if (isEditing) {
      setRenderEditor(true);
      setEditorOpen(false);
      setEditPos(null);
    } else if (renderEditor) {
      setEditorOpen(false);
      editCloseTimerRef.current = window.setTimeout(() => {
        setRenderEditor(false);
        setEditPos(null);
      }, 240);
    }
  }, [isEditing, renderEditor]);

  useEffect(() => {
    if (!renderEditor) return;
    const updatePosition = () => {
      if (!rowRef.current || !editRef.current) return;
      const rect = rowRef.current.getBoundingClientRect();
      const width = Math.min(420, Math.max(280, rect.width * 1.35));
      const height = editRef.current.offsetHeight || 160;
      const gap = 10;
      let top = rect.bottom + gap;
      if (top + height > window.innerHeight - 12) {
        top = rect.top - height - gap;
      }
      top = Math.max(12, top);
      let left = rect.left + rect.width / 2 - width / 2;
      left = Math.min(Math.max(12, left), window.innerWidth - width - 12);
      setEditPos({ top, left, width });
    };
    const raf = window.requestAnimationFrame(() => {
      updatePosition();
      setEditorOpen(true);
      titleRef.current?.focus();
    });
    const handleReposition = () => updatePosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [renderEditor]);

  useEffect(() => {
    if (!isEditing) return;
    const handleClick = (event: MouseEvent) => {
      if (!editRef.current) return;
      if (editRef.current.contains(event.target as Node)) return;
      const currentTitle = title.trim();
      const currentNotes = notes.trim();
      const originalTitle = task.title.trim();
      const originalNotes = (task.notes ?? '').trim();
      if (currentTitle === originalTitle && currentNotes === originalNotes) {
        handleCancel();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isEditing, title, notes, task.title, task.notes]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = () => {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    const nextNotes = notes.trim();
    onUpdate(task.id, {
      title: nextTitle,
      notes: nextNotes,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTitle(task.title);
    setNotes(task.notes ?? '');
  };

  const handleDelete = () => {
    if (isRemoving) return;
    setIsRemoving(true);
    deleteTimerRef.current = window.setTimeout(() => {
      onDelete(task.id);
    }, 220);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSave();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
    if (event.key === 'Backspace' && title.trim().length === 0) {
      event.preventDefault();
      handleDelete();
    }
  };

  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    if (!renderEditor) return;
    autoResize(titleRef.current);
    autoResize(notesRef.current);
  }, [renderEditor]);

  const handleTooltipEnter = () => {
    if (isEditing) return;
    if (!shouldShowTooltip) return;
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setRenderTooltip(true);
    if (showTimerRef.current) {
      window.clearTimeout(showTimerRef.current);
    }
    showTimerRef.current = window.setTimeout(() => {
      updateTooltipPosition();
      setTooltipVisible(true);
    }, 90);
  };

  const hideTooltip = useCallback(() => {
    if (!renderTooltip) return;
    if (showTimerRef.current) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    setTooltipVisible(false);
    hideTimerRef.current = window.setTimeout(() => {
      setRenderTooltip(false);
    }, 240);
  }, [renderTooltip]);

  const handleTooltipLeave = () => {
    hideTooltip();
  };

  useEffect(() => {
    if (isEditing) {
      hideTooltip();
    }
  }, [isEditing, hideTooltip]);

  return (
    <Row
      ref={(node) => {
        setNodeRef(node);
        rowRef.current = node;
      }}
      style={style}
      $dragging={isDragging}
      $disabled={disabled}
      $animate={animate}
      $removing={isRemoving}
      $variant={variant}
      $accent={accent}
      data-task-id={task.id}
    >
      <Handle
        type="button"
        aria-label="Drag task"
        $disabled={disabled}
        $variant={variant}
        $accent={accent}
        $isAdmin={Boolean(task.isAdmin)}
        {...attributes}
        {...listeners}
      >
        {task.isAdmin ? (
          <CrownIcon viewBox="0 2 24 20" aria-hidden $accent={accent}>
            <path d="M4 7l4.2 4.6L12 5l3.8 6.6L20 7v8H4V7z" />
            <rect x="4" y="16" width="16" height="3" rx="1.5" />
          </CrownIcon>
        ) : null}
      </Handle>
      <div>
        <Content
          onClick={() => {
            hideTooltip();
            setIsEditing(true);
          }}
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
        >
          <TitleRow>
            <Title>{highlightText(task.title, query)}</Title>
          </TitleRow>
          {task.notes ? <Notes>{task.notes}</Notes> : null}
        </Content>
      </div>
      <DeleteButton
        type="button"
        onClick={handleDelete}
        aria-label="Delete task"
        $variant={variant}
      >
        ×
      </DeleteButton>
      {renderTooltip && tooltipPos
        ? createPortal(
          <Tooltip
            ref={tooltipRef}
            $top={tooltipPos.top}
            $left={tooltipPos.left}
            $width={tooltipPos.width}
            $placement={tooltipPos.placement}
            $visible={tooltipVisible}
            $accent={accent}
          >
            <TooltipTitle>{task.title}</TooltipTitle>
            {task.notes ? <TooltipBody>{task.notes}</TooltipBody> : null}
          </Tooltip>,
          document.body
        )
        : null}
      {renderEditor
        ? createPortal(
          <EditPopover
            ref={editRef}
            $top={editPos?.top ?? 0}
            $left={editPos?.left ?? 0}
            $width={editPos?.width ?? 320}
            $open={editorOpen && Boolean(editPos)}
            $accent={accent}
          >
            <EditTitleArea
              ref={titleRef}
              $accent={accent}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                autoResize(event.target);
              }}
              onKeyDown={handleKeyDown}
            />
            <EditNotesArea
              ref={notesRef}
              $accent={accent}
              placeholder="Notes (optional)"
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value);
                  autoResize(event.target);
                }}
                onKeyDown={handleKeyDown}
              />
              <EditHint>Enter to save · Shift+Enter for new line · Esc to cancel</EditHint>
            </EditPopover>,
            document.body
          )
        : null}
    </Row>
  );
}
