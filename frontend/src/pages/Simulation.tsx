import React, { useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, Marker } from 'react-leaflet';
import { Play, ShieldAlert, Navigation, RotateCcw } from 'lucide-react';
import {
  postPredict, CORRIDORS, EVENT_CAUSES, ZONES,
  SEVERITY_COLORS, SEVERITY_BG, type PredictResponse,
} from '../lib/api';

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
const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946];

function getCorridorCenter(corridor: string): [number, number] {
  const pts = CORRIDOR_COORDS[corridor] || DEFAULT_ROAD;
  const lat = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const lng = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return [lat, lng];
}

const SEVERITY_LINE_COLOR: Record<string, string> = {
  Low: '#34d399', Medium: '#fbbf24', High: '#f97316', Critical: '#ef4444',
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
  const [zone, setZone] = useState('');

  const road = CORRIDOR_COORDS[corridor] || DEFAULT_ROAD;
  const center = getCorridorCenter(corridor);
  const lineColor = prediction ? (SEVERITY_LINE_COLOR[prediction.severity] ?? '#f97316') : '#334155';

  const handleSimulate = async () => {
    setIsSimulating(true);
    setProgress(0);
    setPrediction(null);
    setError(null);

    // Start progress animation
    const interval = setInterval(() => {
      setProgress(p => (p >= 90 ? 90 : p + 8));
    }, 150);

    try {
      const res = await postPredict({
        event_type: eventType,
        event_cause: eventCause,
        corridor,
        zone: zone || undefined,
        priority,
        requires_road_closure: requiresClosure,
        hour: new Date().getHours(),
      });
      setPrediction(res);
    } catch {
      setError('Backend offline. Showing demo prediction.');
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
    <div className="h-full flex flex-col gap-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-100">Simulation Sandbox</h2>
        <p className="text-slate-400 text-sm mt-1">Test what-if scenarios and predict incident impact on Bengaluru corridors.</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[520px]">
        {/* Map */}
        <div className="flex-1 glass-panel p-2 relative overflow-hidden rounded-2xl min-h-[320px]">
          <MapContainer center={center} zoom={13} key={corridor} className="w-full h-full rounded-xl z-0" zoomControl={true}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            />
            <Polyline positions={road} color="#334155" weight={7} />
            {prediction && (
              <Polyline positions={road} color={lineColor} weight={7} opacity={0.9} />
            )}
            <CircleMarker center={road[0] as [number,number]} radius={10} color={prediction ? lineColor : '#ef4444'} fillColor={prediction ? lineColor : '#ef4444'} fillOpacity={1}>
              <Popup>Incident Origin — {corridor}</Popup>
            </CircleMarker>
          </MapContainer>

          {isSimulating && (
            <div className="absolute top-6 left-6 z-[400] glass-panel-accent p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin" />
              <div>
                <p className="text-orange-400 font-bold text-sm">Analysing Impact…</p>
                <div className="w-32 bg-slate-700 rounded-full h-1.5 mt-2">
                  <div className="bg-orange-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          )}

          {prediction && !isSimulating && (
            <div className={`absolute top-6 left-6 z-[400] p-3 rounded-xl border text-sm font-bold ${SEVERITY_BG[sev]}`}>
              <span className={SEVERITY_COLORS[sev]}>{sev} Severity</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          <div className="glass-panel p-6">
            <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-orange-400" />
              Scenario Builder
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Event Cause</label>
                <select value={eventCause} onChange={e => setEventCause(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-orange-500">
                  {EVENT_CAUSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Corridor</label>
                <select value={corridor} onChange={e => setCorridor(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-orange-500">
                  {CORRIDORS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Priority</label>
                  <select value={priority} onChange={e => setPriority(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-orange-500">
                    <option value="High">High</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Event Type</label>
                  <select value={eventType} onChange={e => setEventType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-orange-500">
                    <option value="unplanned">Unplanned</option>
                    <option value="planned">Planned</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <input type="checkbox" id="closure" checked={requiresClosure} onChange={e => setRequiresClosure(e.target.checked)}
                  className="w-4 h-4 accent-orange-500 cursor-pointer" />
                <label htmlFor="closure" className="text-sm text-slate-300 cursor-pointer">Requires Road Closure</label>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={handleSimulate} disabled={isSimulating}
                  className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm">
                  <Play className="w-4 h-4" />
                  {isSimulating ? 'Analysing…' : 'Run Simulation'}
                </button>
                {prediction && (
                  <button onClick={handleReset} className="p-2 rounded-lg glass-panel hover:bg-slate-700 transition-colors">
                    <RotateCcw className="w-4 h-4 text-slate-400" />
                  </button>
                )}
              </div>
              {error && <p className="text-xs text-amber-400 mt-1">{error}</p>}
            </div>
          </div>

          <div className="glass-panel p-6 flex-1 overflow-y-auto">
            <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Predicted Impact
            </h3>
            {prediction ? (
              <div className="space-y-4">
                {/* Severity badge */}
                <div className={`p-4 rounded-xl border ${SEVERITY_BG[sev]}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Severity</p>
                      <p className={`text-xl font-bold ${SEVERITY_COLORS[sev]}`}>{sev}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 mb-1">Confidence</p>
                      <p className="text-xl font-bold text-slate-200">{prediction.confidence}%</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700">
                    <p className="text-xs text-slate-400">Duration</p>
                    <p className="text-lg font-bold text-slate-100">{prediction.duration_hours.toFixed(1)}h</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700">
                    <p className="text-xs text-slate-400">Impact Score</p>
                    <p className="text-lg font-bold text-slate-100">{prediction.impact_score.toFixed(0)}/100</p>
                  </div>
                </div>
                {prediction.shap_factors.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Key Factors</p>
                    <div className="space-y-2">
                      {prediction.shap_factors.map((f, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400 truncate mr-2">{f.feature}</span>
                            <span className="text-orange-400 shrink-0">+{f.contribution.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5">
                            <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${Math.min(f.contribution, 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center min-h-[100px]">
                <p className="text-sm text-slate-500">Run a simulation to see predicted impact, duration, and key factors.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
