import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { RefreshCw } from 'lucide-react';
import MetricCard from '../components/ui/MetricCard';
import ChartTooltip from '../components/ui/ChartTooltip';
import SpotlightCard from '../components/ui/SpotlightCard';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

interface ZoneStats {
  zone: string;
  max_simultaneous: number;
  avg_simultaneous: number;
  stress_score: number;
  current_stress: number;
  high_stress_moments: number;
}

interface TimelineEntry {
  bucket: string;
  simultaneous_events: number;
  stress_level: number;
}

export default function ZoneStress() {
  const [zoneStats, setZoneStats] = useState<ZoneStats[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchZoneStats = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:8000/api/stress/zones');
      setZoneStats(res.data);
      if (res.data.length > 0 && !selectedZone) {
        setSelectedZone(res.data[0].zone);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load zone stress data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async (zone: string) => {
    try {
      const res = await axios.get(`http://localhost:8000/api/stress/timeline?zone=${encodeURIComponent(zone)}`);
      setTimeline(res.data);
    } catch (err: any) {
      console.error('Failed to load timeline', err);
    }
  };

  useEffect(() => { fetchZoneStats(); }, []);
  useEffect(() => {
    if (selectedZone) fetchTimeline(selectedZone);
    else setTimeline([]);
  }, [selectedZone]);

  if (loading && zoneStats.length === 0) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="p-6 rounded-2xl surface-danger text-red-400">{error}</div>;
  }

  const mostStressed = zoneStats.length > 0 ? zoneStats[0] : null;
  const globalMaxSim = Math.max(...zoneStats.map(z => z.max_simultaneous), 0);
  const totalHighStress = zoneStats.reduce((acc, z) => acc + z.high_stress_moments, 0);
  const avgStress = zoneStats.length > 0 ? (zoneStats.reduce((acc, z) => acc + z.stress_score, 0) / zoneStats.length) : 0;
  
  const getBarColor = (score: number) => {
    if (score > 70) return '#ef4444';
    if (score >= 40) return '#f59e0b';
    return '#10b981';
  };

  const formatTimelineDate = (isoString: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:00`;
  };

  return (
    <motion.div initial="initial" animate="animate" variants={{ animate: { transition: { staggerChildren: 0.1 } } }} className="space-y-8">
      <header className="flex items-end justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white mb-3">Zone Stress</h1>
          <p className="text-zinc-400 text-sm max-w-xl leading-relaxed">
            Real-time overload index mapping simultaneous incidents across city zones. Identifies compounding stress factors before critical failure.
          </p>
        </div>
        <button onClick={fetchZoneStats} disabled={loading} className="p-3 rounded-full hover:bg-white/[0.04] transition-colors">
          <RefreshCw className={`w-4 h-4 text-zinc-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        
        {/* Main Hero Card (Takes up 2 columns) */}
        <motion.div variants={fadeUp} className="md:col-span-2 lg:col-span-2">
          <SpotlightCard className="h-full p-8 flex flex-col justify-between">
            <p className="text-zinc-500 text-sm font-medium tracking-wide uppercase mb-6">Critical Zone</p>
            <div>
              <div className="text-5xl md:text-6xl font-light text-white mb-2 tracking-tight">
                {mostStressed?.zone || '—'}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-amber-500 font-mono text-xl">{mostStressed?.stress_score.toFixed(1)} Score</span>
                <span className="text-zinc-600">|</span>
                <span className="text-zinc-400 text-sm">{mostStressed?.current_stress} active compounding events</span>
              </div>
            </div>
            {mostStressed && mostStressed.stress_score > 80 && (
              <div className="mt-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 text-xs font-semibold uppercase tracking-wider border border-red-500/20 w-fit">
                Pre-deploy officers now
              </div>
            )}
          </SpotlightCard>
        </motion.div>

        <motion.div variants={fadeUp}>
          <MetricCard 
            label="Peak Simultaneous" 
            value={globalMaxSim.toString()} 
          />
        </motion.div>

        <motion.div variants={fadeUp}>
          <MetricCard 
            label="High-Stress Moments" 
            value={totalHighStress.toString()} 
          />
        </motion.div>

        <motion.div variants={fadeUp}>
          <MetricCard 
            label="Avg Stress Index" 
            value={avgStress.toFixed(1)} 
          />
        </motion.div>

        {/* Charts Section */}
        <motion.div variants={fadeUp} className="md:col-span-3 lg:col-span-3">
          <SpotlightCard className="p-8">
            <div className="flex items-center justify-between mb-6">
              <p className="text-zinc-500 text-sm font-medium tracking-wide uppercase">Stress Timeline Overlay</p>
              <select 
                value={selectedZone} 
                onChange={(e) => setSelectedZone(e.target.value)}
                className="bg-transparent border-none text-zinc-300 font-mono text-sm outline-none cursor-pointer"
              >
                {zoneStats.map(z => (
                  <option key={z.zone} value={z.zone} className="bg-[#111113]">{z.zone}</option>
                ))}
              </select>
            </div>
            
            <div className="h-[280px] w-full">
              {timeline.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.02)" vertical={false} />
                    <XAxis dataKey="bucket" tickFormatter={formatTimelineDate} tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: '#52525b', fontSize: 10, fontFamily: 'monospace' }} domain={[0, 100]} axisLine={false} tickLine={false} dx={-10} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 2 }} />
                    <Line type="stepAfter" dataKey="stress_level" name="Stress Index" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: '#09090b', stroke: '#f59e0b', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
                  Awaiting timeline data
                </div>
              )}
            </div>
          </SpotlightCard>
        </motion.div>

        <motion.div variants={fadeUp} className="md:col-span-3 lg:col-span-4">
          <SpotlightCard className="p-8">
            <p className="text-zinc-500 text-sm font-medium tracking-wide uppercase mb-6">City-Wide Zone Hierarchy</p>
            <div style={{ height: Math.max(zoneStats.length * 35, 200) }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zoneStats} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis dataKey="zone" type="category" tick={{ fill: '#a1a1aa', fontSize: 11 }} width={120} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="stress_score" name="Stress Score" radius={[0, 4, 4, 0]} barSize={12}>
                  {zoneStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.stress_score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          </SpotlightCard>
        </motion.div>

      </div>
    </motion.div>
  );
}
