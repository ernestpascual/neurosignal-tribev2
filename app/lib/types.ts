export interface Segment {
  timestep: number;
  overall: number;
  Attention: number;
  Auditory: number;
  Emotion: number;
  Language: number;
  Motor: number;
  Visual: number;
}

export interface AnalysisResult {
  summary: string;
  youtubeUrl?: string;
  timestamps: number;
  statusInfo: string;
  segments: Segment[];
}

export const METRIC_KEYS = [
  "overall",
  "Attention",
  "Auditory",
  "Emotion",
  "Language",
  "Motor",
  "Visual",
] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

export const METRIC_COLORS: Record<MetricKey, string> = {
  overall: "#a78bfa",   // violet-400
  Attention: "#f472b6", // pink-400
  Auditory: "#38bdf8",  // sky-400
  Emotion: "#fb923c",   // orange-400
  Language: "#4ade80",   // green-400
  Motor: "#facc15",     // yellow-400
  Visual: "#22d3ee",    // cyan-400
};

export const METRIC_LABELS: Record<MetricKey, string> = {
  overall: "Overall",
  Attention: "Attention",
  Auditory: "Auditory",
  Emotion: "Emotion",
  Language: "Language",
  Motor: "Motor",
  Visual: "Visual",
};
