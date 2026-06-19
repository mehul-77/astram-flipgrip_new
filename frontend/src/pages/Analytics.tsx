import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, TrendingUp, Activity, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import { fetchAnalytics, FALLBACK_ANALYTICS, MONTH_NAMES, type AnalyticsData } from '../lib/api';
import MetricCard from '../components/ui/MetricCard';
import SectionHeader from '../components/ui/SectionHeader';
import StatusBadge from '../components/ui/StatusBadge';
import ChartTooltip from '../components/ui/ChartTooltip';

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const d = await fetchAnalytics();
      setData(d);
      setIsLive(true);
    } catch {
      setData(FALLBACK_ANALYTICS);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const top10Corridors = data?.corridor_risk.slice(0, 10).map(c => ({
    name: c.corridor.length > 16 ? c.corridor.slice(0, 14) + '…' : c.corridor,
    fullName: c.corridor,
    risk: Math.round(c.risk_score),
    incidents: c.incident_count,
  })) ?? [];

  const hourlyData = data?.hourly_distribution.map(h => ({
    hour: `${String(h.hour).padStart(2, '0')}:00`,
    incidents: h.incident_count,
  })) ?? [];

  const monthlyData = data?.monthly_trend.map(m => ({
    month: MONTH_NAMES[m.month] || `M${m.month}`,
    incidents: m.incident_count,
  })) ?? [];

  const peakHour = data?.hourly_distribution.reduce((a, b) => a.incident_count > b.incident_count ? a : b, { hour: 0, incident_count: 0 });

  // Sparkline data for metric cards
  const hourlySparkline = hourlyData.map(h => ({ v: h.incidents }));
  const monthlySparkline = monthlyData.map(m => ({ v: m.incidents }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-display">Analytics</h1>
          <p className="text-zinc-500 text-sm mt-1.5 flex items-center gap-2">
            Historical risk analysis — Bengaluru corridors
            <StatusBadge
              label={isLive ? 'Live' : 'Demo'}
              variant={isLive ? 'success' : 'warning'}
              pulse={isLive}
            />
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="btn btn-ghost mt-1"
          title="Refresh data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : (
        <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-8">
          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Total Events"
              value={data?.total_events.toLocaleString() ?? '—'}
              icon={<AlertTriangle className="w-4 h-4" />}
              sparklineData={monthlySparkline}
              sparklineColor="#ef4444"
              index={0}
            />
            <MetricCard
              label="Avg. Resolution"
              value={`${data?.avg_duration_hours.toFixed(1) ?? '—'}h`}
              icon={<Clock className="w-4 h-4" />}
              index={1}
            />
            <MetricCard
              label="Closure Rate"
              value={`${data?.closure_rate ?? '—'}%`}
              delta={{ value: '+2.1%', positive: true }}
              icon={<TrendingUp className="w-4 h-4" />}
              index={2}
            />
            <MetricCard
              label="Peak Hour"
              value={`${String(peakHour?.hour ?? 0).padStart(2, '0')}:00`}
              icon={<Activity className="w-4 h-4" />}
              sparklineData={hourlySparkline}
              sparklineColor="#f59e0b"
              index={3}
            />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Risk Corridors — Horizontal Bar */}
            <motion.div variants={fadeUp} className="surface p-5">
              <SectionHeader title="Top Risk Corridors" subtitle="By composite risk score" />
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={top10Corridors} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis type="number" tick={{ fill: '#3f3f46', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} width={110} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(245,158,11,0.04)' }} />
                  <Bar dataKey="risk" name="Risk Score" fill="#f59e0b" radius={[0, 3, 3, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* 24-Hour Pattern */}
            <motion.div variants={fadeUp} className="surface p-5">
              <SectionHeader title="24-Hour Pattern" subtitle="Incident frequency by hour" />
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={hourlyData} margin={{ top: 4, right: 12, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hourlyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fill: '#3f3f46', fontSize: 10 }} interval={3} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#3f3f46', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(245,158,11,0.2)', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="incidents" name="Incidents" stroke="#f59e0b" fill="url(#hourlyGrad)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Monthly Trend */}
            <motion.div variants={fadeUp} className="surface p-5">
              <SectionHeader title="Monthly Trend" subtitle="Incident volume per month" />
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyData} margin={{ top: 4, right: 12, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="monthlyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#3f3f46', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#3f3f46', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(239,68,68,0.15)', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="incidents" name="Incidents" stroke="#ef4444" fill="url(#monthlyGrad)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* High-Risk Junctions — Table */}
            <motion.div variants={fadeUp} className="surface p-5">
              <SectionHeader title="High-Risk Junctions" subtitle="By incident count and risk score" />
              <div className="space-y-0">
                <div className="grid grid-cols-[1fr_80px_80px] gap-2 px-3 py-2 text-label border-b border-white/[0.04]">
                  <span>Junction</span>
                  <span className="text-right">Incidents</span>
                  <span className="text-right">Risk</span>
                </div>
                {(data?.junction_risk.slice(0, 8) ?? []).map((j, i) => (
                  <div key={i} className="grid grid-cols-[1fr_80px_80px] gap-2 px-3 py-2.5 text-sm hover:bg-white/[0.02] transition-colors border-b border-white/[0.02] last:border-0">
                    <span className="text-zinc-300 truncate text-xs">{j.junction.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="text-right font-mono text-xs text-zinc-500">{j.incident_count}</span>
                    <span className="text-right font-mono text-xs font-semibold text-amber-500">{Math.round(j.risk_score).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Corridor Detail Table */}
          <motion.div variants={fadeUp} className="surface p-5">
            <SectionHeader title="Corridor Detail" subtitle="Incidents, duration, and relative risk" />
            <div className="space-y-0">
              <div className="grid grid-cols-[140px_1fr_90px_100px] gap-3 px-3 py-2 text-label border-b border-white/[0.04]">
                <span>Corridor</span>
                <span>Risk</span>
                <span className="text-right">Events</span>
                <span className="text-right">Avg. Duration</span>
              </div>
              {data?.corridor_risk.slice(0, 10).map((c, i) => {
                const maxRisk = data.corridor_risk[0]?.risk_score || 1;
                const pct = (c.risk_score / maxRisk) * 100;
                return (
                  <div key={i} className="grid grid-cols-[140px_1fr_90px_100px] gap-3 items-center px-3 py-2.5 hover:bg-white/[0.02] transition-colors border-b border-white/[0.02] last:border-0">
                    <span className="text-xs text-zinc-400 truncate">{c.corridor}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white/[0.03] rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: `linear-gradient(90deg, #f59e0b, #ea580c)` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-zinc-600 w-14 text-right">{Math.round(c.risk_score).toLocaleString()}</span>
                    </div>
                    <span className="text-xs font-mono text-zinc-500 text-right">{c.incident_count}</span>
                    <span className="text-xs font-mono text-zinc-600 text-right">{c.avg_duration.toFixed(0)} min</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
