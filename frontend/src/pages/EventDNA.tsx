import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Fingerprint, Clock, MapPin, Zap } from 'lucide-react';
import {
  postDNA, CORRIDORS, EVENT_CAUSES, ZONES,
  type SimilarEvent,
} from '../lib/api';
import SectionHeader from '../components/ui/SectionHeader';
import ProgressBar from '../components/ui/ProgressBar';
import EmptyState from '../components/ui/EmptyState';
import StatusBadge from '../components/ui/StatusBadge';

const FALLBACK_MATCHES: SimilarEvent[] = [
  { similarity_pct: 91.2, event_cause: 'vehicle_breakdown', corridor: 'Mysore Road', zone: 'South Zone 1', priority: 'High', resolution_hrs: 2.3, playbook: ['Dispatch tow truck from nearest depot', 'Place warning cones 200m upstream', 'Open adjacent lane for flow'] },
  { similarity_pct: 78.5, event_cause: 'vehicle_breakdown', corridor: 'Outer Ring Road', zone: 'West Zone', priority: 'High', resolution_hrs: 3.1, playbook: ['Dispatch tow truck from nearest depot', 'Set up barricades', 'Notify control room'] },
  { similarity_pct: 64.0, event_cause: 'vehicle_breakdown', corridor: 'Hosur Road', zone: null, priority: 'High', resolution_hrs: 4.5, playbook: ['Set up traffic management', 'Request tow truck', 'Monitor congestion'] },
];

export default function EventDNA() {
  const [eventCause, setEventCause] = useState('vehicle_breakdown');
  const [corridor, setCorridor] = useState('Mysore Road');
  const [zone, setZone] = useState('');
  const [priority, setPriority] = useState('High');
  const [hour, setHour] = useState<number>(new Date().getHours());
  const [k, setK] = useState(3);
  const [requiresClosure, setRequiresClosure] = useState(false);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ query_summary: string; matches: SimilarEvent[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await postDNA({ event_cause: eventCause, corridor, zone: zone || undefined, priority, requires_road_closure: requiresClosure, hour, k });
      setResults(res);
    } catch {
      setError('Backend offline — demo matches.');
      setResults({ query_summary: `${eventCause} on ${corridor} (zone=${zone || 'Unknown'}, priority=${priority}, hour=${hour})`, matches: FALLBACK_MATCHES.slice(0, k) });
    } finally {
      setLoading(false);
    }
  };

  const simColor = (pct: number) => pct >= 80 ? '#22c55e' : pct >= 60 ? '#eab308' : '#f59e0b';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-display">Event DNA</h1>
        <p className="text-zinc-500 text-sm mt-1.5">Find similar historical incidents using Case-Based Reasoning.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Search Form */}
        <div className="surface p-5 space-y-3">
          <SectionHeader title="Query" />
          <div>
            <label className="text-label block mb-1.5">Event Cause</label>
            <select value={eventCause} onChange={e => setEventCause(e.target.value)} disabled={loading} className="input-base">
              {EVENT_CAUSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-label block mb-1.5">Corridor</label>
            <select value={corridor} onChange={e => setCorridor(e.target.value)} disabled={loading} className="input-base">
              {CORRIDORS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-label block mb-1.5">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} disabled={loading} className="input-base">
                <option value="High">High</option><option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="text-label block mb-1.5">Hour</label>
              <input type="number" min={0} max={23} value={hour} onChange={e => setHour(parseInt(e.target.value) || 0)} disabled={loading} className="input-base" />
            </div>
          </div>
          <div>
            <label className="text-label block mb-1.5">Zone</label>
            <select value={zone} onChange={e => setZone(e.target.value)} disabled={loading} className="input-base">
              <option value="">Any</option>{ZONES.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-label">Results</label>
              <span className="font-mono text-xs font-semibold text-amber-500">{k}</span>
            </div>
            <input type="range" min={1} max={8} value={k} onChange={e => setK(parseInt(e.target.value))} disabled={loading}
              className="w-full accent-amber-500 h-1" />
          </div>
          <label className="flex items-center gap-2.5 p-2.5 rounded-md bg-white/[0.02] border border-white/[0.04] cursor-pointer text-sm text-zinc-400">
            <input type="checkbox" checked={requiresClosure} onChange={e => setRequiresClosure(e.target.checked)} disabled={loading}
              className="w-3.5 h-3.5 accent-amber-500 cursor-pointer" />
            Road Closure
          </label>
          {error && <p className="text-xs text-amber-500">{error}</p>}
          <button onClick={handleSearch} disabled={loading} className="btn btn-primary w-full">
            {loading ? <><div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Searching…</> : <><Search className="w-3.5 h-3.5" /> Find Matches</>}
          </button>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-3">
          <AnimatePresence mode="wait">
            {results ? (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="surface px-4 py-2.5">
                  <p className="text-xs text-zinc-500">Query: <span className="text-zinc-300 font-medium">{results.query_summary}</span></p>
                  <p className="text-xs text-zinc-600 mt-0.5">{results.matches.length} matches</p>
                </div>

                {results.matches.map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="surface p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-zinc-600">#{i + 1}</span>
                        <span className="text-section">{EVENT_CAUSES.find(e => e.value === m.event_cause)?.label ?? m.event_cause}</span>
                        <StatusBadge label={m.priority} variant={m.priority === 'High' ? 'danger' : 'neutral'} />
                      </div>
                      <div className="text-xs text-zinc-500 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" /> {m.resolution_hrs.toFixed(1)}h
                      </div>
                    </div>

                    <div>
                      <p className="text-label mb-1">Similarity</p>
                      <ProgressBar value={m.similarity_pct} color={simColor(m.similarity_pct)} size="md" showLabel />
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{m.corridor}</span>
                      {m.zone && <span>{m.zone}</span>}
                    </div>

                    {m.playbook.length > 0 && (
                      <div className="bg-white/[0.02] rounded-md p-3 border border-white/[0.03]">
                        <p className="text-label mb-1.5 flex items-center gap-1"><Zap className="w-3 h-3" /> Playbook</p>
                        <ul className="space-y-1">
                          {m.playbook.map((step, j) => (
                            <li key={j} className="text-xs text-zinc-400 flex items-start gap-1.5">
                              <span className="text-amber-500/50 shrink-0">•</span>{step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <EmptyState
                  icon={<Fingerprint className="w-10 h-10" />}
                  title="No search performed"
                  description="Configure query parameters and click 'Find Matches' to search the historical incident database."
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
