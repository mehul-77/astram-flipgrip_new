import React, { useState } from 'react';
import { Users, Truck, Send, AlertTriangle, MapPin, IndianRupee, Clock, ChevronRight, Copy, Check } from 'lucide-react';
import {
  postPredict, postRecommend, CORRIDORS, EVENT_CAUSES, ZONES,
  SEVERITY_COLORS, SEVERITY_BG,
  type PredictResponse, type RecommendResponse,
} from '../lib/api';

type Step = 'form' | 'predicting' | 'recommending' | 'done';

export default function Recommender() {
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [eventCause, setEventCause] = useState('vehicle_breakdown');
  const [corridor, setCorridor] = useState('Mysore Road');
  const [zone, setZone] = useState('');
  const [priority, setPriority] = useState('High');
  const [requiresClosure, setRequiresClosure] = useState(false);

  const [prediction, setPrediction] = useState<PredictResponse | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendResponse | null>(null);

  const handleAnalyse = async () => {
    setStep('predicting');
    setError(null);
    setPrediction(null);
    setRecommendation(null);

    let pred: PredictResponse;
    try {
      pred = await postPredict({
        event_type: 'unplanned',
        event_cause: eventCause,
        corridor,
        zone: zone || undefined,
        priority,
        requires_road_closure: requiresClosure,
        hour: new Date().getHours(),
      });
    } catch {
      // Fallback prediction
      pred = {
        duration_hours: 3.5,
        impact_score: 72,
        severity: 'High',
        confidence: 84,
        shap_factors: [
          { feature: `corridor: ${corridor}`, contribution: 45 },
          { feature: `event_cause: ${eventCause}`, contribution: 28 },
        ],
      };
      setError('Backend offline — using demo data.');
    }
    setPrediction(pred);
    setStep('recommending');

    let rec: RecommendResponse;
    try {
      rec = await postRecommend({
        event_cause: eventCause,
        corridor,
        impact_score: pred.impact_score,
        zone: zone || undefined,
        requires_road_closure: requiresClosure,
        priority,
        duration_hours: pred.duration_hours,
      });
    } catch {
      rec = {
        officers: pred.impact_score > 60 ? 12 : 6,
        barricade_points: ['500m before incident', 'Nearest upstream junction', 'Nearest downstream junction'],
        diversion_route: `Use alternate parallel roads via secondary junctions around ${corridor}.`,
        est_resolution_hrs: pred.duration_hours * 1.2,
        cost_of_delay: pred.duration_hours * 4 * 25000 * 1.5,
        playbook: [
          '1. Dispatch nearest patrol unit to incident site',
          '2. Set up barricades and warning cones 200m upstream',
          '3. Activate diversion signage at key junctions',
          '4. Monitor and update status every 15 minutes',
        ],
        severity: pred.severity,
      };
    }
    setRecommendation(rec);
    setStep('done');
  };

  const handleReset = () => {
    setStep('form');
    setPrediction(null);
    setRecommendation(null);
    setError(null);
  };

  const dispatchMessage = prediction && recommendation ? `🚨 *ASTRAM ALERT: ${corridor.toUpperCase()}*
*Event:* ${EVENT_CAUSES.find(e => e.value === eventCause)?.label} (${priority} Priority)
*Severity:* ${recommendation.severity}
*Predicted Duration:* ${prediction.duration_hours.toFixed(1)}h
*Impact Score:* ${prediction.impact_score.toFixed(0)}/100
*Action:* Deploy ${recommendation.officers} officers immediately
*Diversion:* ${recommendation.diversion_route}
*Barricades:* ${recommendation.barricade_points.slice(0, 2).join(', ')}
*Est. Resolution:* ${recommendation.est_resolution_hrs.toFixed(1)}h
*Economic Cost:* ₹${Math.round(recommendation.cost_of_delay).toLocaleString('en-IN')}` : '';

  const copyDispatch = async () => {
    try {
      await navigator.clipboard.writeText(dispatchMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const el = document.createElement('textarea');
      el.value = dispatchMessage;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const sev = recommendation?.severity ?? prediction?.severity ?? 'High';
  const isBusy = step === 'predicting' || step === 'recommending';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <header>
        <h2 className="text-2xl font-bold text-slate-100">Resource Recommender</h2>
        <p className="text-slate-400 text-sm mt-1">Enter incident details to get AI-powered deployment recommendations.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="glass-panel p-6 space-y-4">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            Incident Details
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Event Cause</label>
            <select value={eventCause} onChange={e => setEventCause(e.target.value)} disabled={isBusy}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-orange-500 disabled:opacity-60">
              {EVENT_CAUSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Corridor</label>
            <select value={corridor} onChange={e => setCorridor(e.target.value)} disabled={isBusy}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-orange-500 disabled:opacity-60">
              {CORRIDORS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} disabled={isBusy}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-orange-500 disabled:opacity-60">
                <option value="High">High</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Zone (optional)</label>
              <select value={zone} onChange={e => setZone(e.target.value)} disabled={isBusy}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 outline-none focus:border-orange-500 disabled:opacity-60">
                <option value="">Any Zone</option>
                {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <input type="checkbox" id="rec-closure" checked={requiresClosure} onChange={e => setRequiresClosure(e.target.checked)} disabled={isBusy}
              className="w-4 h-4 accent-orange-500 cursor-pointer" />
            <label htmlFor="rec-closure" className="text-sm text-slate-300 cursor-pointer">Requires Road Closure</label>
          </div>

          {error && <p className="text-xs text-amber-400 px-1">{error}</p>}

          {step === 'done' ? (
            <button onClick={handleReset} className="w-full border border-slate-600 hover:border-slate-500 text-slate-300 font-medium py-2 rounded-lg text-sm transition-colors">
              ← Analyse Another Incident
            </button>
          ) : (
            <button onClick={handleAnalyse} disabled={isBusy}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-orange-500/20 text-sm">
              {isBusy ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {step === 'predicting' ? 'Predicting impact…' : 'Generating recommendations…'}
                </>
              ) : (
                <>Analyse &amp; Get Recommendations <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          )}
        </div>

        {/* Results */}
        <div className="space-y-4">
          {prediction && (
            <div className={`glass-panel p-5 border ${SEVERITY_BG[sev]}`}>
              <h3 className="font-semibold text-slate-200 mb-3">ML Prediction</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-slate-400">Severity</p>
                  <p className={`font-bold text-lg ${SEVERITY_COLORS[sev]}`}>{sev}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Duration</p>
                  <p className="font-bold text-lg text-slate-100">{prediction.duration_hours.toFixed(1)}h</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Impact</p>
                  <p className="font-bold text-lg text-slate-100">{prediction.impact_score.toFixed(0)}/100</p>
                </div>
              </div>
            </div>
          )}

          {recommendation && (
            <>
              <div className="glass-panel p-5">
                <h3 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-400" />
                  Deployment Plan
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Officers</p>
                    <p className="text-2xl font-bold text-orange-400">{recommendation.officers}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Est. Resolution</p>
                    <p className="text-2xl font-bold text-slate-100">{recommendation.est_resolution_hrs.toFixed(1)}h</p>
                  </div>
                  <div className="col-span-2 p-3 rounded-xl bg-slate-900/70 border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><IndianRupee className="w-3 h-3" /> Economic Cost of Delay</p>
                    <p className="text-xl font-bold text-rose-400">₹{Math.round(recommendation.cost_of_delay).toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Diversion Route
                  </p>
                  <p className="text-sm text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800">{recommendation.diversion_route}</p>
                </div>

                <div className="mb-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Barricade Points</p>
                  <ul className="space-y-1">
                    {recommendation.barricade_points.map((pt, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-orange-400 shrink-0">•</span>{pt}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Action Playbook</p>
                  <ol className="space-y-1">
                    {recommendation.playbook.map((step, i) => (
                      <li key={i} className="text-sm text-slate-300 leading-snug">{step}</li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="glass-panel-accent p-5">
                <h3 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  <Send className="w-4 h-4 text-orange-400" />
                  WhatsApp Dispatch Message
                </h3>
                <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 font-mono text-xs text-slate-300 whitespace-pre-wrap mb-3 max-h-40 overflow-y-auto">
                  {dispatchMessage}
                </div>
                <button onClick={copyDispatch}
                  className={`w-full font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all text-sm shadow-lg ${
                    copied ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-orange-600 hover:bg-orange-500 shadow-orange-500/20'
                  } text-white`}>
                  {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Dispatch Message</>}
                </button>
              </div>
            </>
          )}

          {!prediction && !recommendation && (
            <div className="glass-panel p-8 flex items-center justify-center text-center h-full min-h-[200px]">
              <p className="text-sm text-slate-500">Fill in the incident details and click<br />"Analyse &amp; Get Recommendations" to start.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
