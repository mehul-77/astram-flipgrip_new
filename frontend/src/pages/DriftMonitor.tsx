import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle, XCircle, AlertTriangle, RefreshCw, Send, BarChart2 } from 'lucide-react';
import { fetchHealth, postFeedback, EVENT_CAUSES, type HealthData, type FeedbackResponse } from '../lib/api';

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
      setFbError('Backend offline — computed drift locally.');
    } finally {
      setFbSubmitting(false);
    }
  };

  const statusColor = health?.status === 'ok' ? 'text-emerald-400' : 'text-rose-400';
  const driftColor = fbResult ? (fbResult.status === 'STABLE' ? 'text-emerald-400' : 'text-rose-400') : '';
  const driftBg = fbResult ? (fbResult.status === 'STABLE' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20') : '';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header>
        <h2 className="text-2xl font-bold text-slate-100">System Health &amp; Drift Monitor</h2>
        <p className="text-slate-400 text-sm mt-1">Monitor model prediction drift against actual field outcomes.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Health Status */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-400" />
              Backend Status
            </h3>
            <button onClick={loadHealth} disabled={healthLoading} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
              <RefreshCw className={`w-4 h-4 text-slate-400 ${healthLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {healthLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : healthError ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
              <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <p className="font-semibold text-rose-400">Backend Offline</p>
                <p className="text-xs text-slate-400 mt-0.5">Unable to reach {`localhost:8000`}. Start the FastAPI server with <code className="text-slate-300">uvicorn main:app --reload</code></p>
              </div>
            </div>
          ) : health ? (
            <>
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-400">System Online</p>
                  <p className="text-xs text-slate-400 mt-0.5">ASTRAM v{health.version} — Status: {health.status}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">ML Model</p>
                  <p className={`font-bold ${health.model_loaded ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {health.model_loaded ? 'Loaded ✓' : 'Not Loaded'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">API Version</p>
                  <p className="font-bold text-slate-100">v{health.version}</p>
                </div>
              </div>

              {!health.model_loaded && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-2 text-xs text-amber-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <p>Model not loaded. Run <code className="text-amber-100">python -m ml.train</code> in the backend directory.</p>
                </div>
              )}
            </>
          ) : null}

          {lastChecked && (
            <p className="text-xs text-slate-500">Last checked: {lastChecked.toLocaleTimeString()}</p>
          )}
        </div>

        {/* Prediction Feedback */}
        <div className="glass-panel p-6">
          <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-orange-400" />
            Log Prediction Feedback
          </h3>
          <form onSubmit={handleFeedback} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Event ID</label>
              <input type="text" value={fbEventId} onChange={e => setFbEventId(e.target.value)} placeholder="e.g. FKID000042" disabled={fbSubmitting}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-orange-500 disabled:opacity-60 placeholder:text-slate-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Event Cause</label>
              <select value={fbCause} onChange={e => setFbCause(e.target.value)} disabled={fbSubmitting}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-orange-500 disabled:opacity-60">
                {EVENT_CAUSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Predicted (hours)</label>
                <input type="number" step="0.1" min="0" value={fbPredicted} onChange={e => setFbPredicted(e.target.value)} placeholder="3.5" disabled={fbSubmitting}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-orange-500 disabled:opacity-60 placeholder:text-slate-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Actual (hours)</label>
                <input type="number" step="0.1" min="0" value={fbActual} onChange={e => setFbActual(e.target.value)} placeholder="4.0" disabled={fbSubmitting}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-orange-500 disabled:opacity-60 placeholder:text-slate-600" />
              </div>
            </div>
            {fbError && <p className="text-xs text-amber-400">{fbError}</p>}
            <button type="submit" disabled={fbSubmitting}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm">
              {fbSubmitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Logging…</>
              ) : (
                <><Send className="w-4 h-4" /> Submit Feedback</>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Drift Result */}
      {fbResult && (
        <div className={`glass-panel p-6 border ${driftBg}`}>
          <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-orange-400" />
            Drift Analysis Result
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Model Status</p>
              <p className={`text-xl font-bold ${driftColor}`}>{fbResult.status}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Drift %</p>
              <p className={`text-xl font-bold ${fbResult.drift_pct > 30 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {fbResult.drift_pct.toFixed(1)}%
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Feedback Logged</p>
              <p className={`text-xl font-bold ${fbResult.logged ? 'text-emerald-400' : 'text-amber-400'}`}>
                {fbResult.logged ? 'Yes ✓' : 'Local only'}
              </p>
            </div>
          </div>
          {fbResult.drift_pct > 30 && (
            <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex gap-2 text-sm text-rose-200">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
              <p>High drift detected ({fbResult.drift_pct.toFixed(1)}%). Model predictions may be degrading — consider retraining with recent data or submitting to the model team.</p>
            </div>
          )}
          {fbResult.category_drift && Object.keys(fbResult.category_drift).length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Per-Cause Drift</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(fbResult.category_drift).map(([cause, pct]) => (
                  <div key={cause} className="flex justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
                    <span className="text-slate-400 truncate">{cause}</span>
                    <span className={`font-bold ml-2 shrink-0 ${pct > 30 ? 'text-rose-400' : 'text-emerald-400'}`}>{pct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
