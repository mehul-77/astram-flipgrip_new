import axios from 'axios';

export const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ShapFactor { feature: string; contribution: number; }

export interface PredictResponse {
  duration_hours: number;
  impact_score: number;
  severity: string;
  shap_factors: ShapFactor[];
  confidence: number;
}

export interface RecommendResponse {
  officers: number;
  barricade_points: string[];
  diversion_route: string;
  est_resolution_hrs: number;
  cost_of_delay: number;
  playbook: string[];
  severity: string;
}

export interface SimilarEvent {
  similarity_pct: number;
  event_cause: string;
  corridor: string;
  zone: string | null;
  priority: string;
  resolution_hrs: number;
  playbook: string[];
}

export interface DNAResponse {
  query_summary: string;
  matches: SimilarEvent[];
}

export interface CorridorRisk { corridor: string; incident_count: number; avg_duration: number; risk_score: number; }
export interface JunctionRisk { junction: string; incident_count: number; avg_duration: number; risk_score: number; }
export interface HourlyBucket { hour: number; incident_count: number; }
export interface MonthlyBucket { month: number; incident_count: number; }
export interface CascadeStat { corridor: string; cascade_count: number; avg_duration: number; }

export interface AnalyticsData {
  corridor_risk: CorridorRisk[];
  junction_risk: JunctionRisk[];
  hourly_distribution: HourlyBucket[];
  monthly_trend: MonthlyBucket[];
  cascade_stats: CascadeStat[];
  total_events: number;
  avg_duration_hours: number;
  closure_rate: number;
}

export interface HealthData { status: string; model_loaded: boolean; version: string; }

export interface FeedbackResponse {
  logged: boolean;
  drift_pct: number;
  status: string;
  category_drift: Record<string, number> | null;
}

// ── Fallback data (used when backend is unreachable) ──────────────────────

export const FALLBACK_ANALYTICS: AnalyticsData = {
  total_events: 6057,
  avg_duration_hours: 2.08,
  closure_rate: 26.3,
  corridor_risk: [
    { corridor: 'Mysore Road', incident_count: 358, avg_duration: 48.19, risk_score: 17252 },
    { corridor: 'Hosur Road', incident_count: 118, avg_duration: 143.37, risk_score: 16917 },
    { corridor: 'Old Madras Road', incident_count: 78, avg_duration: 200.87, risk_score: 15667 },
    { corridor: 'ORR East 1', incident_count: 103, avg_duration: 130.42, risk_score: 13433 },
    { corridor: 'Bannerghata Road', incident_count: 60, avg_duration: 215.76, risk_score: 12945 },
    { corridor: 'CBD 2', incident_count: 47, avg_duration: 273.03, risk_score: 12832 },
    { corridor: 'ORR West 1', incident_count: 83, avg_duration: 105.51, risk_score: 8757 },
    { corridor: 'ORR North 1', incident_count: 98, avg_duration: 84.61, risk_score: 8291 },
    { corridor: 'Bellary Road 2', incident_count: 152, avg_duration: 53.46, risk_score: 8126 },
    { corridor: 'Magadi Road', incident_count: 121, avg_duration: 54.74, risk_score: 6623 },
  ],
  junction_risk: [
    { junction: 'Silk Board Junc', incident_count: 9, avg_duration: 635, risk_score: 5717 },
    { junction: 'CMP Gate Junc', incident_count: 13, avg_duration: 353, risk_score: 4597 },
    { junction: 'Hebbal Flyover Junc', incident_count: 14, avg_duration: 261, risk_score: 3667 },
    { junction: 'Arakere Gate Junc', incident_count: 4, avg_duration: 1045, risk_score: 4183 },
    { junction: 'Katrigue Junc', incident_count: 8, avg_duration: 342, risk_score: 2741 },
  ],
  hourly_distribution: [
    {hour:0,incident_count:418},{hour:1,incident_count:381},{hour:2,incident_count:387},
    {hour:3,incident_count:372},{hour:4,incident_count:558},{hour:5,incident_count:661},
    {hour:6,incident_count:660},{hour:7,incident_count:480},{hour:8,incident_count:327},
    {hour:9,incident_count:160},{hour:10,incident_count:68},{hour:11,incident_count:68},
    {hour:12,incident_count:63},{hour:13,incident_count:33},{hour:14,incident_count:13},
    {hour:15,incident_count:9},{hour:16,incident_count:9},{hour:17,incident_count:34},
    {hour:18,incident_count:228},{hour:19,incident_count:578},{hour:20,incident_count:681},
    {hour:21,incident_count:810},{hour:22,incident_count:564},{hour:23,incident_count:495},
  ],
  monthly_trend: [
    {month:1,incident_count:1446},{month:2,incident_count:1340},{month:3,incident_count:1931},
    {month:4,incident_count:622},{month:11,incident_count:972},{month:12,incident_count:1746},
  ],
  cascade_stats: [],
};

// ── API Calls ─────────────────────────────────────────────────────────────

export async function fetchAnalytics(): Promise<AnalyticsData> {
  const res = await axios.get<AnalyticsData>(`${API_BASE}/api/analytics`, { timeout: 5000 });
  return res.data;
}

export async function postPredict(payload: object): Promise<PredictResponse> {
  const res = await axios.post<PredictResponse>(`${API_BASE}/api/predict`, payload, { timeout: 10000 });
  return res.data;
}

export async function postRecommend(payload: object): Promise<RecommendResponse> {
  const res = await axios.post<RecommendResponse>(`${API_BASE}/api/recommend`, payload, { timeout: 10000 });
  return res.data;
}

export async function postDNA(payload: object): Promise<DNAResponse> {
  const res = await axios.post<DNAResponse>(`${API_BASE}/api/dna`, payload, { timeout: 10000 });
  return res.data;
}

export async function fetchHealth(): Promise<HealthData> {
  const res = await axios.get<HealthData>(`${API_BASE}/health`, { timeout: 5000 });
  return res.data;
}

export async function postFeedback(payload: object): Promise<FeedbackResponse> {
  const res = await axios.post<FeedbackResponse>(`${API_BASE}/api/feedback`, payload, { timeout: 8000 });
  return res.data;
}

// ── Constants ─────────────────────────────────────────────────────────────

export const CORRIDORS = [
  'Mysore Road', 'Hosur Road', 'Old Madras Road', 'Tumkur Road', 'Bellary Road',
  'Outer Ring Road', 'Bannerghatta Road', 'Kanakapura Road', 'Sarjapur Road',
  'Whitefield Road', 'Magadi Road', 'Hebbal Road', 'Airport Road',
];

export const EVENT_CAUSES = [
  { value: 'vehicle_breakdown', label: 'Vehicle Breakdown' },
  { value: 'accident', label: 'Accident' },
  { value: 'water_logging', label: 'Water Logging' },
  { value: 'tree_fall', label: 'Tree Fall' },
  { value: 'construction', label: 'Road Construction' },
  { value: 'congestion', label: 'Heavy Congestion' },
  { value: 'pot_holes', label: 'Potholes' },
  { value: 'public_event', label: 'Public Event (Rally/Match)' },
];

export const ZONES = [
  'North Zone', 'South Zone 1', 'South Zone 2', 'East Zone', 'West Zone', 'Central Zone',
];

export const MONTH_NAMES = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const SEVERITY_COLORS: Record<string, string> = {
  Low: 'text-emerald-400',
  Medium: 'text-amber-400',
  High: 'text-orange-400',
  Critical: 'text-rose-400',
};

export const SEVERITY_BG: Record<string, string> = {
  Low: 'bg-emerald-500/10 border-emerald-500/20',
  Medium: 'bg-amber-500/10 border-amber-500/20',
  High: 'bg-orange-500/10 border-orange-500/20',
  Critical: 'bg-rose-500/10 border-rose-500/20',
};
