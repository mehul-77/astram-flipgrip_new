import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../lib/api';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import MetricCard from '../components/ui/MetricCard';
import ChartTooltip from '../components/ui/ChartTooltip';
import SpotlightCard from '../components/ui/SpotlightCard';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

interface WorkloadStation {
  police_station: string;
  incident_count: number;
  avg_duration_hours: number;
  high_priority_count: number;
  high_priority_rate: number;
  road_closure_count: number;
  workload_score: number;
  status: 'OVERLOADED' | 'BALANCED' | 'UNDERUTILISED';
}

interface Recommendation {
  from_station: string;
  to_station: string;
  suggested_unit_transfer: number;
  reason: string;
}

export default function WorkloadBalancer() {
  const [stations, setStations] = useState<WorkloadStation[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkload = async () => {
    try {
      setLoading(true);
      const [stRes, recRes] = await Promise.all([
        axios.get(`${API_BASE}/api/workload/stations`),
        axios.get(`${API_BASE}/api/workload/recommendation`)
      ]);
      setStations(stRes.data);
      setRecommendations(recRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load workload data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWorkload(); }, []);

  if (loading && stations.length === 0) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) return <div className="p-6 rounded-2xl surface-danger text-red-400">{error}</div>;

  const overloadedStation = stations.find(s => s.status === 'OVERLOADED');
  const underutilisedStation = stations[stations.length - 1];
  const avgWorkload = stations.length > 0 ? (stations.reduce((acc, s) => acc + s.workload_score, 0) / stations.length) : 0;

  const getBarColor = (status: string) => {
    if (status === 'OVERLOADED') return '#ef4444';
    if (status === 'UNDERUTILISED') return '#10b981';
    return '#3f3f46';
  };

  const chartData = stations.slice(0, 15);

  return (
    <motion.div initial="initial" animate="animate" variants={{ animate: { transition: { staggerChildren: 0.1 } } }} className="space-y-8">
      <header className="flex items-end justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white mb-3">Workload Balancer</h1>
          <p className="text-zinc-400 text-sm max-w-xl leading-relaxed">
            Detect asymmetrical burden across Bengaluru's stations. Re-allocate patrol assets dynamically based on historic processing fatigue.
          </p>
        </div>
        <button onClick={fetchWorkload} disabled={loading} className="p-3 rounded-full hover:bg-white/[0.04] transition-colors">
          <RefreshCw className={`w-4 h-4 text-zinc-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div variants={fadeUp}>
          <MetricCard 
            label="Most Overloaded Station" 
            value={overloadedStation?.police_station || 'N/A'} 
            delta={{ value: 'Critical Burden', positive: false }}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard 
            label="Underutilised Asset" 
            value={underutilisedStation?.police_station || 'N/A'} 
            delta={{ value: 'Available for Backup', positive: true }}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard 
            label="Avg Workload Index" 
            value={avgWorkload.toFixed(1)} 
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <SpotlightCard className="p-8">
            <p className="text-zinc-500 text-sm font-medium tracking-wide uppercase mb-6">Top 15 Stations by Fatigue</p>
            <div style={{ height: Math.max(chartData.length * 35, 300) }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.02)" />
                  <XAxis type="number" tick={{ fill: '#52525b', fontSize: 10 }} domain={[0, 100]} axisLine={false} tickLine={false} />
                  <YAxis dataKey="police_station" type="category" tick={{ fill: '#a1a1aa', fontSize: 11 }} width={120} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  <Bar dataKey="workload_score" name="Workload Score" radius={[0, 4, 4, 0]} barSize={12}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SpotlightCard>
        </motion.div>

        <motion.div variants={fadeUp}>
          <SpotlightCard className="p-8">
            <p className="text-zinc-500 text-sm font-medium tracking-wide uppercase mb-6">Rebalancing Actions</p>
            <div className="space-y-1">
              {recommendations.length > 0 ? recommendations.map((rec, i) => (
                <div key={i} className="py-4 border-b border-white/[0.04] last:border-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-emerald-400 font-medium text-sm">{rec.from_station}</span>
                    <span className="text-zinc-600">→</span>
                    <span className="text-red-400 font-medium text-sm">{rec.to_station}</span>
                  </div>
                  <div className="text-xl font-light text-white mb-2 tracking-tight">
                    Move {rec.suggested_unit_transfer} unit{rec.suggested_unit_transfer > 1 ? 's' : ''}
                  </div>
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    {rec.reason}
                  </p>
                </div>
              )) : (
                <div className="text-zinc-600 text-sm h-full flex items-center justify-center">
                  Optimal balance achieved. No actions required.
                </div>
              )}
            </div>
          </SpotlightCard>
        </motion.div>
      </div>

      <motion.div variants={fadeUp}>
        <SpotlightCard className="p-0 overflow-hidden">
          <div className="p-8 pb-4">
            <h2 className="text-xl font-light text-white tracking-tight mb-1">Global Station Matrix</h2>
            <p className="text-zinc-500 text-sm">Detailed overview of all station incident processing loads.</p>
          </div>
          <div className="w-full">
            <div className="grid grid-cols-[1fr_80px_80px_90px_90px_100px] gap-4 px-8 py-4 border-b border-white/[0.02] text-xs font-medium tracking-wide uppercase text-zinc-500 sticky top-0 bg-[#09090b]/80 backdrop-blur-md z-10">
              <span>Station</span>
              <span className="text-right">Score</span>
              <span className="text-right">Incidents</span>
              <span className="text-right">Avg Dur.</span>
              <span className="text-right">High Prio</span>
              <span className="text-right">Status</span>
            </div>
            
            <div className="max-h-[500px] overflow-y-auto">
              {stations.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_80px_90px_90px_100px] gap-4 items-center px-8 py-3 hover:bg-white/[0.01] transition-colors border-b border-white/[0.02] last:border-0">
                  <span className="text-zinc-200 font-medium text-sm truncate">{s.police_station}</span>
                  <span className="text-zinc-300 font-mono text-sm text-right">{s.workload_score.toFixed(1)}</span>
                  <span className="text-zinc-500 font-mono text-sm text-right">{s.incident_count}</span>
                  <span className="text-zinc-500 font-mono text-sm text-right">{s.avg_duration_hours.toFixed(1)}h</span>
                  <span className="text-zinc-500 font-mono text-sm text-right">{(s.high_priority_rate * 100).toFixed(1)}%</span>
                  <span className="text-right flex justify-end">
                    <span className="w-2 h-2 rounded-full" style={{
                      backgroundColor: s.status === 'OVERLOADED' ? '#ef4444' : s.status === 'UNDERUTILISED' ? '#10b981' : '#52525b',
                      boxShadow: s.status === 'OVERLOADED' ? '0 0 10px rgba(239,68,68,0.5)' : s.status === 'UNDERUTILISED' ? '0 0 10px rgba(16,185,129,0.5)' : 'none'
                    }} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SpotlightCard>
      </motion.div>
    </motion.div>
  );
}
