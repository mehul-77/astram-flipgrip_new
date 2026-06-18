import React, { useState } from 'react';
import { Search, Fingerprint, Clock, MapPin, Zap } from 'lucide-react';
import {
  postDNA, CORRIDORS, EVENT_CAUSES, ZONES,
  SEVERITY_COLORS, SEVERITY_BG,
  type SimilarEvent,
} from '../lib/api';

const FALLBACK_MATCHES: SimilarEvent[] = [
  {
    similarity_pct: 91.2,
    event_cause: 'vehicle_breakdown',
    corridor: 'Mysore Road',
    zone: 'South Zone 1',
    priority: 'High',
    resolution_hrs: 2.3,
    playbook: ['Dispatch tow truck from nearest depot', 'Place warning cones 200m upstream', 'Open adjacent lane for flow'],
  },
  {
    similarity_pct: 78.5,
    event_cause: 'vehicle_breakdown',
    corridor: 'Outer Ring Road',
    zone: 'West Zone',
    priority: 'High',
    resolution_hrs: 3.1,
    playbook: ['Dispatch tow truck from nearest depot', 'Set up barricades', 'Notify control room'],
  },
  {
    similarity_pct: 64.0,
    event_cause: 'vehicle_breakdown',
    corridor: 'Hosur Road',
    zone: null,
    priority: 'High',
    resolution_hrs: 4.5,
    playbook: ['Set up traffic management', 'Request tow truck', 'Monitor congestion'],
  },
];

function SimilarityBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? '#34d399' : pct >= 60 ? '#fbbf24' : '#f97316';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-800 rounded-full h-2">
        <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-bold shrink-0" style={{ color }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

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
      const res = await postDNA({
        event_cause: eventCause,
        corridor,
        zone: zone || undefined,
        priority,
        requires_road_closure: requiresClosure,
        hour,
        k,
      });
      setResults(res);
    } catch {
      setError('Backend offline — showing demo matches.');
      setResults({
        query_summary: `${eventCause} on ${corridor} (zone=${zone || 'Unknown'}, priority=${priority}, hour=${hour})`,
        matches: FALLBACK_MATCHES.slice(0, k),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-100">Event DNA Matcher</h2>
        <p className="text-slate-400 text-sm mt-1">Find similar historical incidents using Case-Based Reasoning (KNN).</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search Form */}
        <div className="glass-panel p-6 space-y-4">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-orange-400" />
            Query Parameters
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Event Cause</label>
            <select value={eventCause} onChange={e => setEventCause(e.target.value)} disabled={loading}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-orange-500 disabled:opacity-60">
              {EVENT_CAUSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Corridor</label>
            <select value={corridor} onChange={e => setCorridor(e.target.value)} disabled={loading}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-orange-500 disabled:opacity-60">
              {CORRIDORS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} disabled={loading}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-orange-500 disabled:opacity-60">
                <option value="High">High</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Hour (0–23)</label>
              <input type="number" min={0} max={23} value={hour} onChange={e => setHour(parseInt(e.target.value) || 0)} disabled={loading}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-orange-500 disabled:opacity-60" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Zone (optional)</label>
            <select value={zone} onChange={e => setZone(e.target.value)} disabled={loading}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-orange-500 disabled:opacity-60">
              <option value="">Any Zone</option>
              {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs font-medium text-slate-400">Similar events to return</label>
              <span className="text-orange-400 font-bold text-sm">{k}</span>
            </div>
            <input type="range" min={1} max={8} value={k} onChange={e => setK(parseInt(e.target.value))} disabled={loading}
              className="w-full accent-orange-500" />
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <input type="checkbox" id="dna-closure" checked={requiresClosure} onChange={e => setRequiresClosure(e.target.checked)} disabled={loading}
              className="w-4 h-4 accent-orange-500 cursor-pointer" />
            <label htmlFor="dna-closure" className="text-sm text-slate-300 cursor-pointer">Road Closure</label>
          </div>

          {error && <p className="text-xs text-amber-400">{error}</p>}

          <button onClick={handleSearch} disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm">
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Searching…</>
            ) : (
              <><Search className="w-4 h-4" /> Find Similar Events</>
            )}
          </button>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {results ? (
            <>
              <div className="glass-panel px-5 py-3">
                <p className="text-xs text-slate-400">Query: <span className="text-slate-200 font-medium">{results.query_summary}</span></p>
                <p className="text-xs text-slate-500 mt-0.5">{results.matches.length} similar incidents found</p>
              </div>

              {results.matches.map((m, i) => (
                <div key={i} className="glass-panel p-5 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">#{i + 1}</span>
                      <span className="font-semibold text-slate-200">
                        {EVENT_CAUSES.find(e => e.value === m.event_cause)?.label ?? m.event_cause}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        m.priority === 'High' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-700 text-slate-400'
                      }`}>{m.priority}</span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {m.resolution_hrs.toFixed(1)}h resolution
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 mb-1">Similarity Match</p>
                    <SimilarityBar pct={m.similarity_pct} />
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{m.corridor}</span>
                    {m.zone && <span>{m.zone}</span>}
                  </div>

                  {m.playbook.length > 0 && (
                    <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Recommended Playbook
                      </p>
                      <ul className="space-y-1">
                        {m.playbook.map((step, j) => (
                          <li key={j} className="text-xs text-slate-300 flex items-start gap-1.5">
                            <span className="text-orange-400 shrink-0">•</span>{step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div className="glass-panel p-12 flex flex-col items-center justify-center text-center gap-4 h-full">
              <Fingerprint className="w-12 h-12 text-slate-700" />
              <div>
                <p className="text-slate-400 font-medium">No search performed yet</p>
                <p className="text-sm text-slate-600 mt-1">Set the query parameters and click<br />"Find Similar Events" to search the historical incident database.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
