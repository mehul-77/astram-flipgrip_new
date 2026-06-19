import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Truck, Send, AlertTriangle, MapPin, IndianRupee, Clock, ChevronRight, Copy, Check } from 'lucide-react';
import {
  postPredict, postRecommend, CORRIDORS, EVENT_CAUSES, ZONES,
  SEVERITY_COLORS, SEVERITY_BG,
  type PredictResponse, type RecommendResponse,
} from '../lib/api';
import StatusBadge from '../components/ui/StatusBadge';
import SectionHeader from '../components/ui/SectionHeader';

type Step = 'form' | 'predicting' | 'recommending' | 'done';

const sevToVariant = (s: string) => {
  if (s === 'Low') return 'success' as const;
  if (s === 'Medium') return 'warning' as const;
  if (s === 'Critical') return 'danger' as const;
  return 'warning' as const;
};

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
      pred = {
        duration_hours: 3.5, impact_score: 72, severity: 'High', confidence: 84,
        shap_factors: [
          { feature: `corridor: ${corridor}`, contribution: 45 },
          { feature: `event_cause: ${eventCause}`, contribution: 28 },
        ],
      };
      setError('Backend offline — demo data.');
    }
    setPrediction(pred);
    setStep('recommending');

    let rec: RecommendResponse;
    try {
      rec = await postRecommend({
        event_cause: eventCause, corridor, impact_score: pred.impact_score,
        zone: zone || undefined, requires_road_closure: requiresClosure,
        priority, duration_hours: pred.duration_hours,
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
        <h1 className="text-display">Recommender</h1>
        <p className="text-zinc-500 text-sm mt-1.5">AI-powered deployment recommendations for incident response.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Input Form */}
        <div className="surface p-5 space-y-4">
          <SectionHeader title="Incident Details" />
          <div>
            <label className="text-label block mb-1.5">Event Cause</label>
            <select value={eventCause} onChange={e => setEventCause(e.target.value)} disabled={isBusy}
              className="input-base">{EVENT_CAUSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
          </div>
          <div>
            <label className="text-label block mb-1.5">Corridor</label>
            <select value={corridor} onChange={e => setCorridor(e.target.value)} disabled={isBusy}
              className="input-base">{CORRIDORS.map(c => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-label block mb-1.5">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} disabled={isBusy}
                className="input-base">
                <option value="High">High</option><option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="text-label block mb-1.5">Zone</label>
              <select value={zone} onChange={e => setZone(e.target.value)} disabled={isBusy}
                className="input-base">
                <option value="">Any</option>{ZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2.5 p-2.5 rounded-md bg-white/[0.02] border border-white/[0.04] cursor-pointer text-sm text-zinc-400">
            <input type="checkbox" checked={requiresClosure} onChange={e => setRequiresClosure(e.target.checked)} disabled={isBusy}
              className="w-3.5 h-3.5 accent-amber-500 cursor-pointer" />
            Road Closure Required
          </label>
          {error && <p className="text-xs text-amber-500">{error}</p>}
          {step === 'done' ? (
            <button onClick={handleReset} className="btn btn-secondary w-full">← New Analysis</button>
          ) : (
            <button onClick={handleAnalyse} disabled={isBusy} className="btn btn-primary w-full">
              {isBusy ? (
                <><div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />{step === 'predicting' ? 'Predicting…' : 'Generating…'}</>
              ) : (
                <>Analyse & Recommend <ChevronRight className="w-3.5 h-3.5" /></>
              )}
            </button>
          )}
        </div>

        {/* Results */}
        <div className="space-y-3">
          <AnimatePresence>
            {prediction && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="surface p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-section">ML Prediction</span>
                  <StatusBadge label={sev} variant={sevToVariant(sev)} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><p className="text-label mb-1">Duration</p><p className="text-value-sm">{prediction.duration_hours.toFixed(1)}h</p></div>
                  <div><p className="text-label mb-1">Impact</p><p className="text-value-sm">{prediction.impact_score.toFixed(0)}<span className="text-zinc-600 text-xs">/100</span></p></div>
                  <div><p className="text-label mb-1">Confidence</p><p className="text-value-sm">{prediction.confidence}%</p></div>
                </div>
              </motion.div>
            )}

            {recommendation && (
              <>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="surface p-5">
                  <SectionHeader title="Deployment Plan" />
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 rounded-md bg-white/[0.02] border border-white/[0.04]">
                      <p className="text-label mb-1">Officers</p>
                      <p className="text-value-sm text-amber-500">{recommendation.officers}</p>
                    </div>
                    <div className="p-3 rounded-md bg-white/[0.02] border border-white/[0.04]">
                      <p className="text-label mb-1">Est. Resolution</p>
                      <p className="text-value-sm">{recommendation.est_resolution_hrs.toFixed(1)}h</p>
                    </div>
                    <div className="col-span-2 p-3 rounded-md bg-white/[0.02] border border-white/[0.04]">
                      <p className="text-label mb-1">Economic Cost</p>
                      <p className="text-value-sm text-red-400">₹{Math.round(recommendation.cost_of_delay).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <div className="mb-3">
                    <p className="text-label mb-1.5">Diversion Route</p>
                    <p className="text-xs text-zinc-400 bg-white/[0.02] p-2.5 rounded-md border border-white/[0.04] font-mono leading-relaxed">{recommendation.diversion_route}</p>
                  </div>
                  <div className="mb-3">
                    <p className="text-label mb-1.5">Barricade Points</p>
                    <ul className="space-y-1">
                      {recommendation.barricade_points.map((pt, i) => (
                        <li key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                          <span className="text-amber-500/60 shrink-0">•</span>{pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-label mb-1.5">Playbook</p>
                    <ol className="space-y-1">
                      {recommendation.playbook.map((s, i) => (
                        <li key={i} className="text-xs text-zinc-400 leading-relaxed">{s}</li>
                      ))}
                    </ol>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="surface-accent p-5">
                  <SectionHeader title="Dispatch Message" />
                  <div className="bg-[#09090b] rounded-md border border-white/[0.04] p-3 font-mono text-[11px] text-zinc-400 whitespace-pre-wrap mb-3 max-h-36 overflow-y-auto leading-relaxed">
                    {dispatchMessage}
                  </div>
                  <button onClick={copyDispatch} className={`btn w-full ${copied ? 'bg-emerald-600 text-white' : 'btn-primary'}`}>
                    {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Message</>}
                  </button>
                </motion.div>
              </>
            )}

            {!prediction && !recommendation && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="surface p-12 flex items-center justify-center text-center h-full min-h-[200px]">
                <p className="text-xs text-zinc-600">Fill in details and click<br />"Analyse & Recommend" to start.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
