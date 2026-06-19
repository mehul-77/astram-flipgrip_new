import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, CheckCircle, XCircle, AlertTriangle, RefreshCw, Send, BarChart2 } from 'lucide-react';
import { fetchHealth, postFeedback, EVENT_CAUSES, type HealthData, type FeedbackResponse } from '../lib/api';
import SectionHeader from '../components/ui/SectionHeader';
import StatusBadge from '../components/ui/StatusBadge';

export default function DriftMonitor() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const [fbEventId, setFbEventId] = useState('');
  const [fbCause, setFbCause] = useState('vehicle_breakdown');
  const [fbPredicted, setFbPredicted] = useState('');
  const [fbActual, setFbActual] = useState('');
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [fbResult, setFbResult] = useState<FeedbackResponse | null>(null);
  const [fbError, setFbError] = useState<string | null>(null);

  const loadHealth = async () => {
    setHealthLoading(true);
    setHealthError(false);
    try {
      const h = await fetchHealth();
      setHealth(h);
      setLastChecked(new Date());
    } catch {
      setHealthError(true);
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => { loadHealth(); }, []);

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbEventId.trim() || !fbPredicted || !fbActual) {
      setFbError('All fields are required.');
      return;
    }
    setFbSubmitting(true);
    setFbError(null);
    setFbResult(null);
    try {
      const res = await postFeedback({
        event_id: fbEventId.trim(),
        event_cause: fbCause,
        predicted_hrs: parseFloat(fbPredicted),
        actual_hrs: parseFloat(fbActual),
      });
      setFbResult(res);
    } catch {
      const predicted = parseFloat(fbPredicted);
      const actual = parseFloat(fbActual);
      const drift = Math.abs((actual - predicted) / Math.max(actual, 0.01)) * 100;
      setFbResult({
        logged: false,
        drift_pct: parseFloat(drift.toFixed(1)),
        status: drift > 30 ? 'DRIFTING' : 'STABLE',
        category_drift: null,
      });
      setFbError('Backend offline — computed locally.');
    } finally {
      setFbSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header>
        <h1 className="text-display">Drift Monitor</h1>
        <p className="text-zinc-500 text-sm mt-1.5">Track model prediction accuracy against field outcomes.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Health Status */}
        <div className="surface p-5 space-y-4">
          <SectionHeader
            title="System Health"
            actions={
              <button onClick={loadHealth} disabled={healthLoading} className="btn btn-ghost">
                <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
              </button>
            }
          />

          {healthLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : healthError ? (
            <div className="surface-danger p-4 flex items-center gap-3">
              <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              <div>
                <p className="font-medium text-red-400 text-sm">Backend Offline</p>
                <p className="text-xs text-zinc-500 mt-0.5">Start the FastAPI server with <code className="text-zinc-400 font-mono">uvicorn main:app --reload</code></p>
              </div>
            </div>
          ) : health ? (
            <>
              <div className="surface-success p-4 flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-medium text-emerald-400 text-sm">System Online</p>
                  <p className="text-xs text-zinc-500 mt-0.5">ASTRAM v{health.version} — {health.status}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-md bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-label mb-1">ML Model</p>
                  <p className={`font-mono text-sm font-semibold ${health.model_loaded ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {health.model_loaded ? 'Loaded ✓' : 'Not Loaded'}
                  </p>
                </div>
                <div className="p-3 rounded-md bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-label mb-1">Version</p>
                  <p className="font-mono text-sm font-semibold text-zinc-300">v{health.version}</p>
                </div>
              </div>
              {!health.model_loaded && (
                <div className="surface-accent p-3 flex gap-2 text-xs text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />
                  <p>Model not loaded. Run <code className="font-mono text-amber-200">python -m ml.train</code> in the backend directory.</p>
                </div>
              )}
            </>
          ) : null}

          {lastChecked && (
            <p className="text-xs text-zinc-600 font-mono">Last checked: {lastChecked.toLocaleTimeString()}</p>
          )}
        </div>

        {/* Prediction Feedback */}
        <div className="surface p-5">
          <SectionHeader title="Log Feedback" />
          <form onSubmit={handleFeedback} className="space-y-3">
            <div>
              <label className="text-label block mb-1.5">Event ID</label>
              <input type="text" value={fbEventId} onChange={e => setFbEventId(e.target.value)} placeholder="e.g. FKID000042" disabled={fbSubmitting}
                className="input-base" />
            </div>
            <div>
              <label className="text-label block mb-1.5">Event Cause</label>
              <select value={fbCause} onChange={e => setFbCause(e.target.value)} disabled={fbSubmitting} className="input-base">
                {EVENT_CAUSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-label block mb-1.5">Predicted (h)</label>
                <input type="number" step="0.1" min="0" value={fbPredicted} onChange={e => setFbPredicted(e.target.value)} placeholder="3.5" disabled={fbSubmitting}
                  className="input-base" />
              </div>
              <div>
                <label className="text-label block mb-1.5">Actual (h)</label>
                <input type="number" step="0.1" min="0" value={fbActual} onChange={e => setFbActual(e.target.value)} placeholder="4.0" disabled={fbSubmitting}
                  className="input-base" />
              </div>
            </div>
            {fbError && <p className="text-xs text-amber-500">{fbError}</p>}
            <button type="submit" disabled={fbSubmitting} className="btn btn-primary w-full">
              {fbSubmitting ? <><div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Logging…</> : <><Send className="w-3.5 h-3.5" /> Submit</>}
            </button>
          </form>
        </div>
      </div>

      {/* Drift Result */}
      <AnimatePresence>
        {fbResult && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className={`surface p-5 border ${fbResult.status === 'STABLE' ? 'border-emerald-500/15' : 'border-red-500/15'}`}
          >
            <SectionHeader title="Drift Analysis" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-md bg-white/[0.02] border border-white/[0.04]">
                <p className="text-label mb-1">Status</p>
                <StatusBadge label={fbResult.status} variant={fbResult.status === 'STABLE' ? 'success' : 'danger'} />
              </div>
              <div className="p-3 rounded-md bg-white/[0.02] border border-white/[0.04]">
                <p className="text-label mb-1">Drift</p>
                <p className={`text-value-sm ${fbResult.drift_pct > 30 ? 'text-red-400' : 'text-emerald-400'}`}>{fbResult.drift_pct.toFixed(1)}%</p>
              </div>
              <div className="p-3 rounded-md bg-white/[0.02] border border-white/[0.04]">
                <p className="text-label mb-1">Logged</p>
                <p className={`font-mono text-sm font-semibold ${fbResult.logged ? 'text-emerald-400' : 'text-amber-400'}`}>{fbResult.logged ? 'Yes ✓' : 'Local'}</p>
              </div>
            </div>
            {fbResult.drift_pct > 30 && (
              <div className="mt-4 surface-danger p-3 flex gap-2 text-xs text-red-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400 mt-0.5" />
                <p>High drift ({fbResult.drift_pct.toFixed(1)}%). Consider retraining with recent data.</p>
              </div>
            )}
            {fbResult.category_drift && Object.keys(fbResult.category_drift).length > 0 && (
              <div className="mt-4">
                <p className="text-label mb-2">Per-Cause Drift</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(fbResult.category_drift).map(([cause, pct]) => (
                    <div key={cause} className="flex justify-between p-2 rounded-md bg-white/[0.02] border border-white/[0.03] text-xs">
                      <span className="text-zinc-500 truncate">{cause}</span>
                      <span className={`font-mono font-semibold ml-2 shrink-0 ${pct > 30 ? 'text-red-400' : 'text-emerald-400'}`}>{pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
