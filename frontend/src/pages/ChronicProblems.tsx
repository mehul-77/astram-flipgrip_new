import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import MetricCard from '../components/ui/MetricCard';
import ChartTooltip from '../components/ui/ChartTooltip';
import SpotlightCard from '../components/ui/SpotlightCard';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

interface ChronicProblem {
  corridor: string;
  event_cause: string;
  occurrences: number;
  avg_duration_hours: number;
  total_hours_lost: number;
  road_closure_rate: number;
  latest_occurrence: string;
  severity: 'SEVERE' | 'HIGH' | 'MODERATE';
}

interface TrendData {
  month: number;
  count: number;
}

export default function ChronicProblems() {
  const [problems, setProblems] = useState<ChronicProblem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:8000/api/chronic/problems');
      setProblems(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load chronic problems');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProblems(); }, []);

  const handleRowClick = async (problem: ChronicProblem) => {
    const rowId = `${problem.corridor}-${problem.event_cause}`;
    if (expandedRow === rowId) {
      setExpandedRow(null);
      return;
    }
    
    setExpandedRow(rowId);
    try {
      const res = await axios.get(`http://localhost:8000/api/chronic/trend?corridor=${encodeURIComponent(problem.corridor)}&event_cause=${encodeURIComponent(problem.event_cause)}`);
      setTrendData(res.data);
    } catch (err) {
      console.error("Failed to load trend", err);
      setTrendData([]);
    }
  };

  if (loading && problems.length === 0) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) return <div className="p-6 rounded-2xl surface-danger text-red-400">{error}</div>;

  const mostChronicCorridor = problems.length > 0 ? problems[0].corridor : 'N/A';
  
  const causeMap: Record<string, number> = {};
  let totalHours = 0;
  problems.forEach(p => {
    causeMap[p.event_cause] = (causeMap[p.event_cause] || 0) + p.occurrences;
    totalHours += p.total_hours_lost;
  });
  const mostChronicCause = Object.entries(causeMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  const generatePolicyText = (p: ChronicProblem) => {
    const formattedCause = p.event_cause.replace(/_/g, ' ');
    if (p.event_cause === 'water_logging') {
      return `${p.corridor} has experienced ${p.occurrences} waterlogging incidents. This requires immediate drainage infrastructure intervention, not increased policing.`;
    }
    if (p.event_cause === 'tree_fall') {
      return `${p.corridor} has seen ${p.occurrences} tree falls. Requires urgent municipal canopy trimming.`;
    }
    if (p.event_cause === 'vehicle_breakdown') {
      return `Chronic vehicle breakdowns (${p.occurrences} times) on ${p.corridor}. Recommend a dedicated towing unit stationed nearby during peak hours.`;
    }
    return `${p.corridor} suffers chronically from ${formattedCause} (${p.occurrences} events). Requires dedicated structural planning.`;
  };

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const formattedTrend = trendData.map(d => ({ monthStr: monthNames[d.month - 1], count: d.count }));

  return (
    <motion.div initial="initial" animate="animate" variants={{ animate: { transition: { staggerChildren: 0.1 } } }} className="space-y-8">
      <header className="flex items-end justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white mb-3">Chronic Problems</h1>
          <p className="text-zinc-400 text-sm max-w-xl leading-relaxed italic">
            "These are not random events. These are Bengaluru's structural traffic diseases."
          </p>
        </div>
        <button onClick={fetchProblems} disabled={loading} className="p-3 rounded-full hover:bg-white/[0.04] transition-colors">
          <RefreshCw className={`w-4 h-4 text-zinc-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div variants={fadeUp}>
          <MetricCard 
            label="Most Chronic Corridor" 
            value={mostChronicCorridor.length > 20 ? mostChronicCorridor.slice(0,18)+'...' : mostChronicCorridor} 
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard 
            label="Most Chronic Issue" 
            value={mostChronicCause.replace(/_/g, ' ')} 
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard 
            label="Total Hours Lost" 
            value={Math.round(totalHours)} 
            delta={{ value: 'Hours', positive: false }}
          />
        </motion.div>
      </div>

      <motion.div variants={fadeUp}>
        <SpotlightCard className="p-0 overflow-hidden">
          <div className="p-8 pb-4">
            <h2 className="text-xl font-light text-white tracking-tight mb-1">Structural Issue Registry</h2>
            <p className="text-zinc-500 text-sm">Select a corridor to view policy recommendations and historic trends.</p>
          </div>
          
          <div className="w-full">
            <div className="grid grid-cols-[1.5fr_1fr_80px_100px_100px_80px_40px] gap-4 px-8 py-4 border-b border-white/[0.02] text-xs font-medium tracking-wide uppercase text-zinc-500 hidden md:grid">
              <span>Corridor</span>
              <span>Event Cause</span>
              <span className="text-right">Events</span>
              <span className="text-right">Avg Dur.</span>
              <span className="text-right">Hrs Lost</span>
              <span className="text-center">Severity</span>
              <span></span>
            </div>
            
            <div className="flex flex-col">
              {problems.map((p) => {
                const rowId = `${p.corridor}-${p.event_cause}`;
                const isExpanded = expandedRow === rowId;
                
                return (
                  <div key={rowId} className="group border-b border-white/[0.02] last:border-0">
                    <div 
                      onClick={() => handleRowClick(p)}
                      className={`grid grid-cols-1 md:grid-cols-[1.5fr_1fr_80px_100px_100px_80px_40px] gap-4 items-center px-8 py-5 cursor-pointer transition-all duration-300 ${isExpanded ? 'bg-white/[0.03]' : 'hover:bg-white/[0.01]'}`}
                    >
                      <span className="text-zinc-200 font-medium text-base truncate tracking-tight">{p.corridor}</span>
                      <span className="text-zinc-400 text-sm capitalize truncate">{p.event_cause.replace(/_/g, ' ')}</span>
                      <span className="text-zinc-500 font-mono text-sm md:text-right">{p.occurrences}</span>
                      <span className="text-zinc-500 font-mono text-sm md:text-right">{p.avg_duration_hours}h</span>
                      <span className="text-white font-mono text-base md:text-right">{Math.round(p.total_hours_lost)}h</span>
                      <span className="md:text-center flex justify-center">
                        <span className="w-2 h-2 rounded-full" style={{
                          backgroundColor: p.severity === 'SEVERE' ? '#ef4444' : p.severity === 'HIGH' ? '#f59e0b' : '#10b981',
                          boxShadow: `0 0 12px ${p.severity === 'SEVERE' ? 'rgba(239,68,68,0.6)' : p.severity === 'HIGH' ? 'rgba(245,158,11,0.6)' : 'rgba(16,185,129,0.6)'}`
                        }} />
                      </span>
                      <span className="text-zinc-600 justify-self-end transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        <ChevronDown className="w-4 h-4" />
                      </span>
                    </div>
                    
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="bg-[#09090b]/50 px-8 py-8 border-t border-white/[0.02]">
                            <div className="flex flex-col lg:flex-row gap-12 items-start">
                              <div className="flex-1 w-full min-h-[220px]">
                                <p className="text-zinc-500 text-xs font-medium tracking-wide uppercase mb-6">Historic Occurrence Trend</p>
                                <ResponsiveContainer width="100%" height={180}>
                                  <BarChart data={formattedTrend} margin={{top: 0, right: 0, left: -20, bottom: 0}}>
                                    <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.02)" />
                                    <XAxis dataKey="monthStr" stroke="none" tick={{fill: '#71717a', fontSize: 11}} dy={10} />
                                    <YAxis stroke="none" tick={{fill: '#71717a', fontSize: 11, fontFamily: 'monospace'}} dx={-10} />
                                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                    <Bar dataKey="count" name="Incidents" fill="#52525b" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                      {formattedTrend.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === formattedTrend.length - 1 ? '#f59e0b' : '#3f3f46'} />
                                      ))}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="lg:w-[400px] w-full">
                                <p className="text-amber-500/80 text-xs font-medium tracking-wide uppercase mb-4">Structural Policy Recommendation</p>
                                <div className="text-zinc-300 text-base leading-relaxed font-light">
                                  {generatePolicyText(p)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </SpotlightCard>
      </motion.div>
    </motion.div>
  );
}
