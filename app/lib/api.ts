import type { AnalysisResult } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:7860";

/**
 * Transform the standard API response into the AnalysisResult shape
 * (matching chowking.json format).
 */
function transformResponse(
  data: Record<string, unknown>,
  inputUrl?: string
): AnalysisResult {
  const chartData = (data.chart_data || []) as Record<string, number>[];
  return {
    summary: (data.agent_summary as string) || "",
    youtubeUrl: inputUrl || undefined,
    timestamps: (data.total_timesteps as number) || chartData.length,
    statusInfo: (data.statusInfo as string) || "",
    segments: chartData.map((point) => ({
      timestep: point.timestep,
      overall: point.overall,
      Attention: point.Attention,
      Auditory: point.Auditory,
      Emotion: point.Emotion,
      Language: point.Language,
      Motor: point.Motor,
      Visual: point.Visual,
    })),
  };
}

export async function analyzeText(text: string): Promise<AnalysisResult> {
  const form = new FormData();
  form.append("text", text);

  const res = await fetch(`${API_BASE}/api/analyze-text`, {
    method: "POST",
    body: form,
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Analysis failed");
  return transformResponse(data);
}

export async function analyzeYoutube(url: string): Promise<AnalysisResult> {
  const form = new FormData();
  form.append("youtube_url", url);

  const res = await fetch(`${API_BASE}/api/analyze-video-youtube`, {
    method: "POST",
    body: form,
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Analysis failed");
  return transformResponse(data, url);
}

export async function analyzeVideo(file: File): Promise<AnalysisResult> {
  const form = new FormData();
  form.append("video", file);

  const res = await fetch(`${API_BASE}/api/analyze-video`, {
    method: "POST",
    body: form,
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Analysis failed");
  return transformResponse(data);
}
