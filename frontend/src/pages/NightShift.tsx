import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea, CartesianGrid, Cell } from 'recharts';
import MetricCard from '../components/ui/MetricCard';
import ChartTooltip from '../components/ui/ChartTooltip';
import SpotlightCard from '../components/ui/SpotlightCard';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

interface HourlyData {
  hour: number;
  incident_count: number;
  avg_duration_hours: number;
  high_priority_rate: number;
  road_closure_rate: number;
}

interface SummaryStats {
  night_incident_pct: number;
  night_avg_duration: number;
  day_avg_duration: number;
  night_resolution_penalty: number;
}

interface CorridorStats {
  corridor: string;
  night_count: number;
  night_avg_duration: number;
  night_closure_rate: number;
  recommended_overnight_officers: number;
}

export default function NightShift() {
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [corridors, setCorridors] = useState<CorridorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNightData = async () => {
    try {
      setLoading(true);
      const [overviewRes, corridorsRes] = await Promise.all([
        axios.get('http://localhost:8000/api/nightshift/overview'),
        axios.get('http://localhost:8000/api/nightshift/corridors')
      ]);
      setHourlyData(overviewRes.data.hourly);
      setSummary(overviewRes.data.summary);
      setCorridors(corridorsRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load night shift intelligence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNightData(); }, []);

  if (loading && hourlyData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) return <div className="p-6 rounded-2xl surface-danger text-red-400">{error}</div>;

  const formatHour = (h: number) => {
    if (h === 0) return '12 AM';
    if (h < 12) return `${h} AM`;
    if (h === 12) return '12 PM';
    return `${h - 12} PM`;
  };

  const chartData = hourlyData.map(d => ({
    ...d,
    hourLabel: formatHour(d.hour)
  }));

  return (
    <motion.div initial="initial" animate="animate" variants={{ animate: { transition: { staggerChildren: 0.1 } } }} className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white mb-3">Night Shift Intel</h1>
          <p className="text-zinc-400 text-sm max-w-xl leading-relaxed">
            Targeted resource mapping for the 9PM–6AM inverted peak period. The real crisis happens when visibility drops and speeds increase.
          </p>
        </div>
        <button onClick={fetchNightData} disabled={loading} className="p-3 rounded-full hover:bg-white/[0.04] transition-colors self-start md:self-auto">
          <RefreshCw className={`w-4 h-4 text-zinc-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div variants={fadeUp}>
            <MetricCard 
              label="Night Incident Volume" 
              value={`${summary.night_incident_pct}%`} 
              delta={{ value: 'of 24h total', positive: false }} 
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <MetricCard 
              label="Avg Night Resolution" 
              value={`${summary.night_avg_duration}h`} 
              delta={{ value: `Daytime avg: ${summary.day_avg_duration}h`, positive: true }} 
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <MetricCard 
              label="Night Penalty" 
              value={`+${summary.night_resolution_penalty}%`} 
              delta={{ value: 'Extra duration overhead', positive: false }} 
            />
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <SpotlightCard className="p-8 h-[460px]">
            <p className="text-zinc-500 text-sm font-medium tracking-wide uppercase mb-6">24-Hour Velocity & Volume Trend</p>
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 0, bottom: 0, left: -20 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.02)" vertical={false} />
                  <XAxis dataKey="hourLabel" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis yAxisId="left" tick={{ fill: '#52525b', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} dx={-10} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#52525b', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} dx={10} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  
                  <ReferenceArea yAxisId="left" x1="9 PM" x2="11 PM" fill="#6366f1" fillOpacity={0.03} />
                  <ReferenceArea yAxisId="left" x1="12 AM" x2="5 AM" fill="#6366f1" fillOpacity={0.03} />

                  <Bar yAxisId="left" dataKey="incident_count" name="Incidents" fill="#52525b" radius={[4, 4, 0, 0]} maxBarSize={30}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={(d.hour >= 21 || d.hour <= 5) ? 'rgba(99, 102, 241, 0.4)' : '#27272a'} />
                    ))}
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="avg_duration_hours" name="Avg Duration (h)" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: '#09090b', stroke: '#f59e0b', strokeWidth: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </SpotlightCard>
        </motion.div>

        <motion.div variants={fadeUp}>
          <SpotlightCard className="p-0 overflow-hidden h-[460px] flex flex-col">
            <div className="p-8 pb-4 border-b border-white/[0.02] bg-[#09090b]/80 backdrop-blur-md">
              <h3 className="text-lg font-light text-white tracking-tight mb-1">Overnight Placements</h3>
              <p className="text-zinc-500 text-xs">Required deployment (9PM-6AM)</p>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-[1fr_50px_80px] gap-2 px-8 py-3 text-[10px] font-medium tracking-wider uppercase text-zinc-500 sticky top-0 bg-[#09090b] z-10 border-b border-white/[0.02]">
                <span>Corridor</span>
                <span className="text-right">Dur.</span>
                <span className="text-right">Officers</span>
              </div>
              
              {corridors.map((c, i) => (
                <div key={i} className="grid grid-cols-[1fr_50px_80px] gap-2 items-center px-8 py-3 hover:bg-white/[0.01] transition-colors border-b border-white/[0.02] last:border-0">
                  <span className="text-zinc-300 text-sm truncate pr-2">{c.corridor}</span>
                  <span className="text-amber-500/80 font-mono text-xs text-right">{c.night_avg_duration}h</span>
                  <span className="text-right flex justify-end">
                    <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded text-[10px] font-bold font-mono ${
                      c.recommended_overnight_officers >= 8 ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      c.recommended_overnight_officers >= 4 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}>
                      {c.recommended_overnight_officers}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </SpotlightCard>
        </motion.div>
      </div>
    </motion.div>
  );
}
