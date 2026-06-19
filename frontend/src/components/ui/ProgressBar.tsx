import React from 'react';

interface ProgressBarProps {
  value: number; // 0-100
  color?: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export default function ProgressBar({ value, color = '#f59e0b', size = 'sm', showLabel = false }: ProgressBarProps) {
  const h = size === 'sm' ? 'h-1.5' : 'h-2.5';
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-white/[0.04] rounded-full ${h} overflow-hidden`}>
        <div
          className={`${h} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-mono font-semibold shrink-0" style={{ color }}>
          {value.toFixed(1)}%
        </span>
      )}
    </div>
  );
}
