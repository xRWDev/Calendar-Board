import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { createPortal } from 'react-dom';
import type { Country } from '@calendar/shared';

const Wrapper = styled.div`
  position: relative;
  min-width: 180px;
`;

const Button = styled.button`
  width: 100%;
  min-width: 180px;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-weight: 500;
  box-shadow: var(--shadow);
  cursor: pointer;

  span {
    white-space: nowrap;
  }
`;

const caretPulse = keyframes`
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(1px);
  }
  100% {
    transform: translateY(0);
  }
`;

const Caret = styled.span<{ $open: boolean }>`
  display: inline-flex;
  width: 10px;
  height: 10px;
  border-right: 2px solid var(--muted);
  border-bottom: 2px solid var(--muted);
  transform: ${(props) => (props.$open ? 'rotate(-135deg)' : 'rotate(45deg)')};
  transition: transform 200ms ease;
  animation: ${caretPulse} 1.4s ease-in-out infinite;
`;

const Panel = styled.div<{
  $top: number;
  $left: number;
  $width: number;
  $open: boolean;
}>`
  position: fixed;
  top: ${(props) => props.$top}px;
  left: ${(props) => props.$left}px;
  width: ${(props) => props.$width}px;
  min-width: 180px;
  max-height: 280px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 16px;
  padding: 6px;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(14px);
  z-index: 60;
  opacity: ${(props) => (props.$open ? 1 : 0)};
  transform: ${(props) =>
    props.$open ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.98)'};
  filter: ${(props) => (props.$open ? 'blur(0)' : 'blur(8px)')};
  transition: opacity 240ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 300ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 300ms cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: ${(props) => (props.$open ? 'auto' : 'none')};
  transform-origin: top center;
  will-change: transform, opacity, filter;
`;

const OptionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 260px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;

  &::-webkit-scrollbar {
    width: 8px;
    height: 0;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.6);
    border-radius: 999px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.6) transparent;
`;

const OptionItem = styled.button<{ $active: boolean }>`
  border: none;
  border-radius: 12px;
  padding: 8px 10px;
  background: ${(props) => (props.$active ? 'rgba(255, 122, 69, 0.12)' : 'transparent')};
  color: ${(props) => (props.$active ? 'var(--ink)' : 'var(--muted)')};
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 180ms ease, color 180ms ease;

  &:hover {
    background: rgba(255, 122, 69, 0.18);
    color: var(--ink);
  }
`;

interface CountrySelectProps {
  value: string;
  options: Country[];
  onChange: (next: string) => void;
}

export function CountrySelect({ value, options, onChange }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const selected = useMemo(
    () => options.find((option) => option.countryCode === value),
    [options, value]
  );

  const openPanel = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpen(true);
    setReady(false);
    setPos(null);
  };

  const closePanel = () => {
    setReady(false);
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      setPos(null);
    }, 240);
  };

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      if (!buttonRef.current || !panelRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const panelHeight = panelRef.current.offsetHeight;
      const width = Math.max(rect.width, 180);
      let top = rect.bottom + 8;
      if (top + panelHeight > window.innerHeight - 12) {
        top = rect.top - panelHeight - 8;
      }
      top = Math.max(12, top);
      let left = rect.left;
      left = Math.min(Math.max(12, left), window.innerWidth - width - 12);
      setPos({ top, left, width });
    };
    const raf = window.requestAnimationFrame(() => {
      updatePosition();
      setReady(true);
    });
    const handleClick = (event: MouseEvent) => {
      if (!panelRef.current || !buttonRef.current) return;
      const target = event.target as Node;
      if (panelRef.current.contains(target) || buttonRef.current.contains(target)) return;
      closePanel();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePanel();
    };
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  return (
    <Wrapper>
      <Button type="button" ref={buttonRef} onClick={() => (open ? closePanel() : openPanel())}>
        <span>{selected?.name ?? 'Select country'}</span>
        <Caret $open={open} />
      </Button>
      {open &&
        createPortal(
          <Panel
            ref={panelRef}
            $top={pos?.top ?? 0}
            $left={pos?.left ?? 0}
            $width={pos?.width ?? 260}
            $open={ready}
          >
            <OptionList>
              {options.map((option) => (
                <OptionItem
                  key={option.countryCode}
                  type="button"
                  $active={option.countryCode === value}
                  onClick={() => {
                    onChange(option.countryCode);
                    closePanel();
                  }}
                >
                  {option.name}
                </OptionItem>
              ))}
            </OptionList>
          </Panel>,
          document.body
        )}
    </Wrapper>
  );
}
