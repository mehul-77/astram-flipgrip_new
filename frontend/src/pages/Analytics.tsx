import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Clock, TrendingUp, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import { fetchAnalytics, FALLBACK_ANALYTICS, MONTH_NAMES, type AnalyticsData } from '../lib/api';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value.toLocaleString()}</span></p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const d = await fetchAnalytics();
      setData(d);
      setIsLive(true);
    } catch {
      setData(FALLBACK_ANALYTICS);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const top10Corridors = data?.corridor_risk.slice(0, 10).map(c => ({
    name: c.corridor.length > 18 ? c.corridor.slice(0, 16) + '…' : c.corridor,
    fullName: c.corridor,
    risk: Math.round(c.risk_score),
    incidents: c.incident_count,
  })) ?? [];

  const hourlyData = data?.hourly_distribution.map(h => ({
    hour: `${String(h.hour).padStart(2, '0')}:00`,
    incidents: h.incident_count,
  })) ?? [];

  const monthlyData = data?.monthly_trend.map(m => ({
    month: MONTH_NAMES[m.month] || `M${m.month}`,
    incidents: m.incident_count,
  })) ?? [];

  const peakHour = data?.hourly_distribution.reduce((a, b) => a.incident_count > b.incident_count ? a : b, { hour: 0, incident_count: 0 });

  const stats = data ? [
    { label: 'Total Events (Historical)', value: data.total_events.toLocaleString(), icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-400/10' },
    { label: 'Avg. Resolution Time', value: `${data.avg_duration_hours.toFixed(1)}h`, icon: Clock, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { label: 'Closure Rate', value: `${data.closure_rate}%`, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Peak Hour', value: `${String(peakHour?.hour ?? 0).padStart(2, '0')}:00`, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  ] : [];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Analytics Command Center</h2>
          <p className="text-slate-400 text-sm mt-1">
            Historical risk analysis for Bengaluru corridors.{' '}
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${isLive ? 'text-emerald-400' : 'text-amber-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {isLive ? 'Live data' : 'Demo data'}
            </span>
          </p>
        </div>
        <button onClick={load} disabled={loading} className="p-2 rounded-lg glass-panel hover:bg-slate-800 transition-colors" title="Refresh">
          <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <div key={i} className="glass-panel p-5 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${s.bg} shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-400 truncate">{s.label}</p>
                  <p className="text-xl font-bold text-slate-100">{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-panel p-6">
              <h3 className="font-semibold text-slate-200 mb-1">Top Risk Corridors</h3>
              <p className="text-xs text-slate-500 mb-4">By composite risk score</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={top10Corridors} margin={{ top: 0, right: 0, left: -10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(249,115,22,0.07)' }} />
                  <Bar dataKey="risk" name="Risk Score" fill="#f97316" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-panel p-6">
              <h3 className="font-semibold text-slate-200 mb-1">24-Hour Incident Pattern</h3>
              <p className="text-xs text-slate-500 mb-4">Incident frequency by hour of day</p>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={hourlyData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hourlyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 9 }} interval={3} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f97316', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="incidents" name="Incidents" stroke="#f97316" fill="url(#hourlyGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Trend */}
            <div className="glass-panel p-6">
              <h3 className="font-semibold text-slate-200 mb-1">Monthly Incident Trend</h3>
              <p className="text-xs text-slate-500 mb-4">Total incidents per month</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(249,115,22,0.07)' }} />
                  <Bar dataKey="incidents" name="Incidents" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Junctions */}
            <div className="glass-panel p-6">
              <h3 className="font-semibold text-slate-200 mb-1">High-Risk Junctions</h3>
              <p className="text-xs text-slate-500 mb-4">By incident count and avg. duration</p>
              <div className="space-y-2 overflow-y-auto max-h-48">
                {(data?.junction_risk.slice(0, 8) ?? []).map((j, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="text-sm font-medium text-slate-200 truncate">{j.junction.replace(/([A-Z])/g, ' $1').trim()}</p>
                      <p className="text-xs text-slate-500">{j.incident_count} incidents</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-orange-400">{Math.round(j.risk_score).toLocaleString()}</p>
                      <p className="text-xs text-slate-500">risk score</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Corridor Incidents Table */}
          <div className="glass-panel p-6">
            <h3 className="font-semibold text-slate-200 mb-4">Corridor Detail — Incidents &amp; Avg. Duration</h3>
            <div className="space-y-2">
              {data?.corridor_risk.slice(0, 8).map((c, i) => {
                const maxRisk = data.corridor_risk[0]?.risk_score || 1;
                const pct = (c.risk_score / maxRisk) * 100;
                return (
                  <div key={i} className="flex items-center gap-4">
                    <span className="text-xs text-slate-400 w-36 shrink-0 truncate">{c.corridor}</span>
                    <div className="flex-1 bg-slate-800 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-16 text-right shrink-0">{c.incident_count} events</span>
                    <span className="text-xs text-slate-500 w-16 text-right shrink-0">{c.avg_duration.toFixed(0)} min avg</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
