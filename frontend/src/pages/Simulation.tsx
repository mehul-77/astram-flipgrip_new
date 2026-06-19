import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from 'react-leaflet';
import { Play, ShieldAlert, Navigation, RotateCcw } from 'lucide-react';
import {
  postPredict, CORRIDORS, EVENT_CAUSES,
  SEVERITY_COLORS, SEVERITY_BG, type PredictResponse,
} from '../lib/api';
import StatusBadge from '../components/ui/StatusBadge';
import SectionHeader from '../components/ui/SectionHeader';

const CORRIDOR_COORDS: Record<string, [number, number][]> = {
  'Mysore Road':        [[12.9716, 77.5946],[12.9750, 77.5780],[12.9780, 77.5600],[12.9810, 77.5420]],
  'Hosur Road':         [[12.9279, 77.6270],[12.9100, 77.6400],[12.8900, 77.6500],[12.8700, 77.6580]],
  'Old Madras Road':    [[12.9958, 77.6280],[13.0050, 77.6450],[13.0120, 77.6600],[13.0200, 77.6750]],
  'Outer Ring Road':    [[12.9279, 77.6270],[12.9500, 77.7000],[12.9900, 77.7100],[13.0200, 77.6800]],
  'Bellary Road':       [[13.0358, 77.5970],[13.0600, 77.5800],[13.0800, 77.5700],[13.1000, 77.5600]],
  'Tumkur Road':        [[13.0150, 77.5670],[13.0300, 77.5400],[13.0450, 77.5200],[13.0600, 77.5000]],
  'Bannerghatta Road':  [[12.9016, 77.5946],[12.8800, 77.5980],[12.8600, 77.6020],[12.8400, 77.6060]],
  'Kanakapura Road':    [[12.9016, 77.5746],[12.8800, 77.5600],[12.8600, 77.5450],[12.8400, 77.5300]],
  'Sarjapur Road':      [[12.9279, 77.6770],[12.9100, 77.7000],[12.8900, 77.7200],[12.8700, 77.7400]],
  'Whitefield Road':    [[12.9779, 77.7480],[12.9800, 77.7600],[12.9820, 77.7750],[12.9840, 77.7900]],
  'Magadi Road':        [[12.9716, 77.5546],[12.9700, 77.5400],[12.9680, 77.5250],[12.9660, 77.5100]],
};

const DEFAULT_ROAD: [number, number][] = [[12.9716, 77.5946],[12.9750, 77.5780],[12.9780, 77.5600],[12.9810, 77.5420]];

function getCorridorCenter(corridor: string): [number, number] {
  const pts = CORRIDOR_COORDS[corridor] || DEFAULT_ROAD;
  const lat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const lng = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return [lat, lng];
}

const SEVERITY_LINE_COLOR: Record<string, string> = {
  Low: '#22c55e', Medium: '#eab308', High: '#f59e0b', Critical: '#ef4444',
};

const sevToVariant = (s: string) => {
  if (s === 'Low') return 'success' as const;
  if (s === 'Medium') return 'warning' as const;
  if (s === 'Critical') return 'danger' as const;
  return 'warning' as const;
};

export default function Simulation() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [prediction, setPrediction] = useState<PredictResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [eventCause, setEventCause] = useState('vehicle_breakdown');
  const [corridor, setCorridor] = useState('Mysore Road');
  const [priority, setPriority] = useState('High');
  const [eventType, setEventType] = useState('unplanned');
  const [requiresClosure, setRequiresClosure] = useState(false);

  const road = CORRIDOR_COORDS[corridor] || DEFAULT_ROAD;
  const center = getCorridorCenter(corridor);
  const lineColor = prediction ? (SEVERITY_LINE_COLOR[prediction.severity] ?? '#f59e0b') : '#27272a';

  const handleSimulate = async () => {
    setIsSimulating(true);
    setProgress(0);
    setPrediction(null);
    setError(null);

    const interval = setInterval(() => {
      setProgress(p => (p >= 90 ? 90 : p + 8));
    }, 150);

    try {
      const res = await postPredict({
        event_type: eventType,
        event_cause: eventCause,
        corridor,
        priority,
        requires_road_closure: requiresClosure,
        hour: new Date().getHours(),
      });
      setPrediction(res);
    } catch {
      setError('Backend offline — demo prediction.');
      setPrediction({
        duration_hours: 3.5,
        impact_score: 72,
        severity: 'High',
        confidence: 84,
        shap_factors: [
          { feature: `corridor: ${corridor}`, contribution: 45 },
          { feature: `event_cause: ${eventCause}`, contribution: 28 },
          { feature: 'requires_road_closure', contribution: 18 },
        ],
      });
    } finally {
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => setIsSimulating(false), 300);
    }
  };

  const handleReset = () => {
    setPrediction(null);
    setProgress(0);
    setError(null);
  };

  const sev = prediction?.severity ?? 'High';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-display">Simulation</h1>
        <p className="text-zinc-500 text-sm mt-1.5">Test what-if scenarios and predict incident impact.</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-4" style={{ minHeight: 520 }}>
        {/* Map */}
        <div className="flex-1 surface p-1.5 relative overflow-hidden min-h-[320px]">
          <MapContainer center={center} zoom={13} key={corridor} className="w-full h-full rounded-md z-0" zoomControl={true}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap &copy; CARTO'
            />
            <Polyline positions={road} color="#27272a" weight={6} />
            {prediction && (
              <Polyline positions={road} color={lineColor} weight={6} opacity={0.9} />
            )}
            <CircleMarker center={road[0] as [number,number]} radius={8} color={prediction ? lineColor : '#ef4444'} fillColor={prediction ? lineColor : '#ef4444'} fillOpacity={1}>
              <Popup>Incident Origin — {corridor}</Popup>
            </CircleMarker>
          </MapContainer>

          <AnimatePresence>
            {isSimulating && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute top-4 left-4 z-[400] surface-accent p-3 flex items-center gap-3 rounded-md"
              >
                <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
                <div>
                  <p className="text-amber-400 font-semibold text-xs">Analysing…</p>
                  <div className="w-24 bg-white/[0.04] rounded-full h-1 mt-1.5">
                    <div className="bg-amber-500 h-1 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {prediction && !isSimulating && (
            <div className="absolute top-4 left-4 z-[400]">
              <StatusBadge label={`${sev} Severity`} variant={sevToVariant(sev)} />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="w-full lg:w-[320px] flex flex-col gap-3">
          <div className="surface p-5">
            <SectionHeader
              title="Scenario Builder"
              subtitle="Configure incident parameters"
            />
            <div className="space-y-3">
              <div>
                <label className="text-label block mb-1.5">Event Cause</label>
                <select value={eventCause} onChange={e => setEventCause(e.target.value)}
                  className="input-base">
                  {EVENT_CAUSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-label block mb-1.5">Corridor</label>
                <select value={corridor} onChange={e => setCorridor(e.target.value)}
                  className="input-base">
                  {CORRIDORS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-label block mb-1.5">Priority</label>
                  <select value={priority} onChange={e => setPriority(e.target.value)}
                    className="input-base">
                    <option value="High">High</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-label block mb-1.5">Type</label>
                  <select value={eventType} onChange={e => setEventType(e.target.value)}
                    className="input-base">
                    <option value="unplanned">Unplanned</option>
                    <option value="planned">Planned</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2.5 p-2.5 rounded-md bg-white/[0.02] border border-white/[0.04] cursor-pointer text-sm text-zinc-400 hover:text-zinc-300 transition-colors">
                <input type="checkbox" checked={requiresClosure} onChange={e => setRequiresClosure(e.target.checked)}
                  className="w-3.5 h-3.5 accent-amber-500 cursor-pointer" />
                Road Closure Required
              </label>
              <div className="flex gap-2 pt-1">
                <button onClick={handleSimulate} disabled={isSimulating}
                  className="btn btn-primary flex-1">
                  <Play className="w-3.5 h-3.5" />
                  {isSimulating ? 'Analysing…' : 'Run'}
                </button>
                {prediction && (
                  <button onClick={handleReset} className="btn btn-ghost">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {error && <p className="text-xs text-amber-500">{error}</p>}
            </div>
          </div>

          {/* Predicted Impact */}
          <div className="surface p-5 flex-1 overflow-y-auto">
            <SectionHeader title="Predicted Impact" />
            <AnimatePresence mode="wait">
              {prediction ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <div className="flex gap-3">
                    <div className="flex-1 p-3 rounded-md bg-white/[0.02] border border-white/[0.04]">
                      <p className="text-label mb-1">Duration</p>
                      <p className="text-value-sm">{prediction.duration_hours.toFixed(1)}h</p>
                    </div>
                    <div className="flex-1 p-3 rounded-md bg-white/[0.02] border border-white/[0.04]">
                      <p className="text-label mb-1">Impact</p>
                      <p className="text-value-sm">{prediction.impact_score.toFixed(0)}<span className="text-zinc-600 text-xs">/100</span></p>
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-label">Confidence</span>
                    <span className="font-mono text-sm font-semibold text-zinc-300">{prediction.confidence}%</span>
                  </div>
                  {prediction.shap_factors.length > 0 && (
                    <div>
                      <p className="text-label mb-2">Key Factors</p>
                      <div className="space-y-2">
                        {prediction.shap_factors.map((f, i) => (
                          <div key={i}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-zinc-500 truncate mr-2">{f.feature}</span>
                              <span className="text-amber-500 font-mono shrink-0">+{f.contribution.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-white/[0.03] rounded-full h-1">
                              <div className="bg-amber-500/60 h-1 rounded-full" style={{ width: `${Math.min(f.contribution, 100)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center text-center py-8"
                >
                  <p className="text-xs text-zinc-600">Run a simulation to see predictions.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
