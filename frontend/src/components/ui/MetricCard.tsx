import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import SpotlightCard from './SpotlightCard';
import AnimatedNumber from './AnimatedNumber';

interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: { value: string; positive: boolean } | null;
  sparklineData?: { v: number }[];
  sparklineColor?: string;
  icon?: React.ReactNode;
  index?: number;
}

export default function MetricCard({
  label,
  value,
  delta,
  sparklineData,
  sparklineColor = '#f59e0b',
  icon,
}: MetricCardProps) {
  const DeltaIcon = delta ? (delta.positive ? TrendingUp : TrendingDown) : Minus;
  
  const isNumeric = typeof value === 'number' || !isNaN(Number(value));
  const numericValue = isNumeric ? Number(value) : 0;

  return (
    <SpotlightCard className="p-6 flex flex-col justify-between gap-4 group">
      <div className="flex items-start justify-between">
        <p className="text-zinc-500 text-sm font-medium tracking-wide uppercase">{label}</p>
        {icon && (
          <div className="text-zinc-600 group-hover:text-zinc-300 transition-colors duration-500">
            {icon}
          </div>
        )}
      </div>
      
      <div className="mt-2">
        <div className="text-3xl md:text-4xl font-light tracking-tight text-white font-mono">
          {isNumeric ? (
            <AnimatedNumber 
              value={numericValue} 
              format={(val) => Math.round(val).toLocaleString()} 
            />
          ) : (
            <span>{value}</span>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between gap-3 mt-1">
        {delta && (
          <div className={`flex items-center gap-1.5 text-xs font-medium tracking-wide ${delta.positive ? 'text-emerald-500/80' : 'text-red-500/80'}`}>
            <DeltaIcon className="w-3.5 h-3.5" />
            <span>{delta.value}</span>
          </div>
        )}
        {sparklineData && sparklineData.length > 1 && (
          <div className="flex-1 h-8 max-w-[100px] opacity-60 group-hover:opacity-100 transition-opacity duration-500">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`spark-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sparklineColor} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={sparklineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={sparklineColor}
                  strokeWidth={1.5}
                  fill={`url(#spark-${label.replace(/\s/g, '')})`}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </SpotlightCard>
  );
}
