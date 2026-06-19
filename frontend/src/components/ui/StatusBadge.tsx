import React from 'react';

type Variant = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

interface StatusBadgeProps {
  label: string;
  variant?: Variant;
  pulse?: boolean;
}

const COLORS: Record<Variant, { dot: string; text: string; bg: string }> = {
  success: { dot: 'bg-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  warning: { dot: 'bg-amber-500', text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  danger: { dot: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  neutral: { dot: 'bg-zinc-500', text: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/20' },
  info: { dot: 'bg-blue-500', text: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
};

export default function StatusBadge({ label, variant = 'neutral', pulse = false }: StatusBadgeProps) {
  const c = COLORS[variant];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${pulse ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  );
}
