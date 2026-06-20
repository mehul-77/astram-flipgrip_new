import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ArrowRight } from 'lucide-react';
import StatusBadge from '../components/ui/StatusBadge';
import SpotlightCard from '../components/ui/SpotlightCard';

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

interface TransitionMap {
  trigger: string;
  follow_up: string;
  count: number;
  avg_time_to_next_hours: number;
  avg_next_duration_hours: number;
  follow_probability: number;
}

interface FollowUp {
  follow_up: string;
  probability: number;
  avg_time_to_next_hours: number;
}

interface CheckResponse {
  highest_risk_followup: string | null;
  warning_level: string;
  avg_time_to_next: number | null;
  recommended_preemptive_action: string;
  top_followups: FollowUp[];
}

export default function PrecursorWarning() {
  const [mapData, setMapData] = useState<TransitionMap[]>([]);
  const [loadingMap, setLoadingMap] = useState(true);
  
  const [corridor, setCorridor] = useState('ORR East 1');
  const [eventCause, setEventCause] = useState('vehicle_breakdown');
  const [checkResult, setCheckResult] = useState<CheckResponse | null>(null);
  const [checking, setChecking] = useState(false);

  const fetchMap = async () => {
    try {
      setLoadingMap(true);
      const res = await axios.get(`${API_BASE}/api/precursor/map`);
      setMapData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMap(false);
    }
  };

  useEffect(() => { fetchMap(); }, []);

  const handleCheck = async () => {
    try {
      setChecking(true);
      const res = await axios.post(`${API_BASE}/api/precursor/check`, {
        event_cause: eventCause,
        corridor: corridor
      });
      setCheckResult(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setChecking(false);
    }
  };

  const triggers = Array.from(new Set(mapData.map(d => d.trigger)));
  const followUps = Array.from(new Set(mapData.map(d => d.follow_up)));

  const getHeatmapColor = (prob: number) => {
    if (prob === 0) return { bg: 'bg-white/[0.01]', shadow: 'none', border: 'border-white/[0.03]' };
    if (prob > 0.5) return { bg: 'bg-red-500/20', shadow: '0 0 16px rgba(239,68,68,0.4)', border: 'border-red-500/50' };
    if (prob > 0.3) return { bg: 'bg-amber-500/20', shadow: '0 0 12px rgba(245,158,11,0.3)', border: 'border-amber-500/40' };
    if (prob > 0.1) return { bg: 'bg-indigo-500/20', shadow: '0 0 8px rgba(99,102,241,0.2)', border: 'border-indigo-500/30' };
    return { bg: 'bg-zinc-500/20', shadow: 'none', border: 'border-zinc-500/30' };
  };

  const uniqueCauses = ['vehicle_breakdown', 'accident', 'water_logging', 'tree_fall', 'planned_event', 'others'];
  const dummyCorridors = ['ORR East 1', 'Mysore Road', 'Hosur Road', 'Bellary Road 1', 'Tumkur Road'];

  return (
    <motion.div initial="initial" animate="animate" variants={{ animate: { transition: { staggerChildren: 0.1 } } }} className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white mb-3">Precursor Warning</h1>
          <p className="text-zinc-400 text-sm max-w-xl leading-relaxed">
            Identify early warning signals. Statistical transition matrices show when a minor incident triggers a severe cascade effect.
          </p>
        </div>
        <button onClick={fetchMap} disabled={loadingMap} className="p-3 rounded-full hover:bg-white/[0.04] transition-colors self-start md:self-auto">
          <RefreshCw className={`w-4 h-4 text-zinc-500 ${loadingMap ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Cascade Risk Checker */}
        <motion.div variants={fadeUp}>
          <SpotlightCard className="p-8 h-full flex flex-col">
            <p className="text-zinc-500 text-sm font-medium tracking-wide uppercase mb-6">Live Cascade Analysis</p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div>
                <label className="block text-zinc-500 text-[10px] font-medium tracking-widest uppercase mb-2">Initial Event</label>
                <select 
                  value={eventCause} 
                  onChange={e => setEventCause(e.target.value)}
                  className="w-full bg-[#09090b] border border-white/[0.08] text-zinc-200 text-sm rounded-lg px-4 py-2.5 outline-none focus:border-amber-500/50 transition-colors cursor-pointer"
                >
                  {uniqueCauses.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-zinc-500 text-[10px] font-medium tracking-widest uppercase mb-2">Corridor</label>
                <select 
                  value={corridor} 
                  onChange={e => setCorridor(e.target.value)}
                  className="w-full bg-[#09090b] border border-white/[0.08] text-zinc-200 text-sm rounded-lg px-4 py-2.5 outline-none focus:border-amber-500/50 transition-colors cursor-pointer"
                >
                  {dummyCorridors.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <button 
              onClick={handleCheck}
              disabled={checking}
              className="w-full bg-white text-black hover:bg-zinc-200 transition-colors rounded-lg py-3 text-sm font-semibold tracking-wide disabled:opacity-50"
            >
              {checking ? 'Analyzing Transition Matrix...' : 'Compute Cascade Risk'}
            </button>

            <AnimatePresence mode="wait">
              {checkResult && (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 flex-1 flex flex-col"
                >
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/[0.04]">
                    <span className="text-sm font-medium text-zinc-400">Threat Level</span>
                    <StatusBadge 
                      label={checkResult.warning_level} 
                      variant={checkResult.warning_level === 'HIGH' ? 'danger' : checkResult.warning_level === 'MEDIUM' ? 'warning' : 'success'} 
                      pulse={checkResult.warning_level === 'HIGH'}
                    />
                  </div>

                  {checkResult.top_followups.length > 0 ? (
                    <div className="space-y-6">
                      <div>
                        <p className="text-[10px] font-medium tracking-widest text-zinc-500 uppercase mb-2">Likely Follow-Ups</p>
                        <div className="space-y-3">
                          {checkResult.top_followups.map((f, i) => (
                            <div key={i} className="flex flex-col gap-1.5">
                              <div className="flex justify-between text-sm">
                                <span className="text-zinc-200 capitalize">{f.follow_up.replace(/_/g, ' ')}</span>
                                <span className="text-zinc-500 font-mono text-xs">~{f.avg_time_to_next_hours}h</span>
                              </div>
                              <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${f.probability * 100}%` }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                  className={`h-full rounded-full ${f.probability > 0.5 ? 'bg-red-500' : 'bg-amber-500'}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4">
                        <p className="text-[10px] font-medium tracking-widest text-amber-500/80 uppercase mb-1">Preemptive Action</p>
                        <p className="text-sm text-amber-200/80 leading-relaxed font-light">{checkResult.recommended_preemptive_action}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm font-light">
                      No significant cascade risks detected.
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </SpotlightCard>
        </motion.div>

        {/* Transition Matrix Heatmap */}
        <motion.div variants={fadeUp}>
          <SpotlightCard className="p-8 h-full overflow-x-auto">
            <p className="text-zinc-500 text-sm font-medium tracking-wide uppercase mb-8">Statistical Transition Matrix</p>
            {loadingMap && mapData.length === 0 ? (
              <div className="h-48 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-zinc-500/30 border-t-zinc-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="min-w-[420px]">
                <div className="flex">
                  <div className="w-32 shrink-0"></div>
                  {followUps.map(f => (
                    <div key={f} className="flex-1 text-[10px] text-zinc-500 font-mono -rotate-45 origin-bottom-left text-right pb-3 h-24 whitespace-nowrap">
                      {f.replace(/_/g, ' ')}
                    </div>
                  ))}
                </div>
                {triggers.map(t => (
                  <div key={t} className="flex items-center mb-1.5 gap-1.5">
                    <div className="w-32 shrink-0 text-[10px] text-zinc-400 font-mono text-right truncate pr-2">
                      {t.replace(/_/g, ' ')}
                    </div>
                    {followUps.map(f => {
                      const cell = mapData.find(d => d.trigger === t && d.follow_up === f);
                      const prob = cell ? cell.follow_probability : 0;
                      const style = getHeatmapColor(prob);
                      return (
                        <div 
                          key={`${t}-${f}`} 
                          className={`flex-1 aspect-square rounded-md border relative group cursor-pointer transition-all duration-300 ${style.bg} ${style.border}`}
                          style={{ boxShadow: style.shadow }}
                        >
                          {prob > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm bg-black/40 rounded-md">
                              {Math.round(prob * 100)}%
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </SpotlightCard>
        </motion.div>
      </div>

      <motion.div variants={fadeUp}>
        <SpotlightCard className="p-0 overflow-hidden">
          <div className="p-8 pb-4">
            <h2 className="text-xl font-light text-white tracking-tight mb-1">Most Dangerous Precursors</h2>
            <p className="text-zinc-500 text-sm">Sorted by transition probability</p>
          </div>
          <div className="w-full">
            <div className="grid grid-cols-[1.5fr_80px_100px_80px] gap-4 px-8 py-4 border-b border-white/[0.02] text-xs font-medium tracking-wide uppercase text-zinc-500 bg-[#09090b]/80 backdrop-blur-md">
              <span>Cascade Pattern</span>
              <span className="text-right">Prob.</span>
              <span className="text-right">Avg Time</span>
              <span className="text-right">Samples</span>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto">
              {mapData.slice(0, 8).map((d, i) => (
                <div key={i} className="grid grid-cols-[1.5fr_80px_100px_80px] gap-4 items-center px-8 py-3.5 hover:bg-white/[0.01] transition-colors border-b border-white/[0.02] last:border-0">
                  <div className="flex items-center gap-3 text-sm truncate">
                    <span className="text-zinc-400 capitalize truncate font-light">{d.trigger.replace(/_/g, ' ')}</span>
                    <ArrowRight className="w-3 h-3 text-zinc-600 shrink-0" />
                    <span className="text-amber-500/90 font-medium capitalize truncate">{d.follow_up.replace(/_/g, ' ')}</span>
                  </div>
                  <span className="text-zinc-200 font-mono text-sm text-right">{(d.follow_probability * 100).toFixed(1)}%</span>
                  <span className="text-zinc-500 font-mono text-sm text-right">{d.avg_time_to_next_hours}h</span>
                  <span className="text-zinc-600 font-mono text-sm text-right">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </SpotlightCard>
      </motion.div>
    </motion.div>
  );
}
