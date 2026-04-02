'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { CursorPosition } from '@/hooks/use-board-presence';

interface LiveCursorsProps {
  cursors: CursorPosition[];
  containerRef: React.RefObject<HTMLElement | null>;
  onMouseMove: (x: number, y: number) => void;
}

export function LiveCursors({ cursors, containerRef, onMouseMove }: LiveCursorsProps) {
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    if (throttleRef.current) return;

    throttleRef.current = setTimeout(() => {
      throttleRef.current = null;
    }, 50); // 20fps throttle

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width)  * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;

    // Only broadcast when inside container
    if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
      onMouseMove(x, y);
    }
  }, [containerRef, onMouseMove]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('mousemove', handleMouseMove);
    return () => container.removeEventListener('mousemove', handleMouseMove);
  }, [containerRef, handleMouseMove]);

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {cursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute transition-all duration-75 ease-linear will-change-transform"
          style={{
            left: `${cursor.x}%`,
            top:  `${cursor.y}%`,
            transform: 'translate(-2px, -2px)',
          }}
        >
          {/* SVG cursor */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: `drop-shadow(0 1px 2px ${cursor.color}66)` }}
          >
            <path
              d="M3 2L16 10.5L10 12L7 18L3 2Z"
              fill={cursor.color}
              stroke="white"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>

          {/* Name tag */}
          <div
            className="absolute left-4 top-3 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow-md"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.name.split(' ')[0]}
          </div>
        </div>
      ))}
    </div>
  );
}
