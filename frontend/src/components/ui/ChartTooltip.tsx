import React from 'react';

interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatter?: (value: number) => string;
}

export default function ChartTooltip({ active, payload, label, formatter }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="surface-elevated px-3 py-2.5 shadow-xl shadow-black/40 min-w-[120px]" style={{ borderRadius: 6 }}>
      <p className="text-xs font-medium text-zinc-400 mb-1.5 font-mono">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-zinc-500">{p.name}</span>
          <span className="ml-auto font-mono font-semibold text-zinc-200">
            {formatter ? formatter(p.value) : p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
