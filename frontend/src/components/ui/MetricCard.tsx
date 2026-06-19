import React from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
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
  index = 0,
}: MetricCardProps) {
  const DeltaIcon = delta ? (delta.positive ? TrendingUp : TrendingDown) : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="surface p-5 flex flex-col justify-between gap-3 group hover:border-white/[0.1] transition-colors duration-200"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-label mb-2">{label}</p>
          <p className="text-value">{value}</p>
        </div>
        {icon && (
          <div className="p-2 rounded-md bg-white/[0.03] text-zinc-500 group-hover:text-amber-500/80 transition-colors">
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-end justify-between gap-3">
        {delta && (
          <div className={`flex items-center gap-1 text-xs font-medium ${delta.positive ? 'text-emerald-500' : 'text-red-500'}`}>
            <DeltaIcon className="w-3 h-3" />
            <span>{delta.value}</span>
          </div>
        )}
        {sparklineData && sparklineData.length > 1 && (
          <div className="flex-1 h-8 max-w-[100px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`spark-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sparklineColor} stopOpacity={0.3} />
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
    </motion.div>
  );
}
