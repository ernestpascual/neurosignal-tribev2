import type { AnalysisResult, JobMetadata, JobDetail } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:7860";

/**
 * Transform the standard API response into the AnalysisResult shape
 * (matching chowking.json format).
 */
export function transformResponse(
  data: Record<string, unknown>,
  inputUrl?: string,
  inputText?: string
): AnalysisResult {
  const chartData = (data.chart_data || []) as Record<string, number>[];
  return {
    summary: (data.agent_summary as string) || "",
    youtubeUrl: inputUrl || undefined,
    text: inputText || (data.text as string) || undefined,
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

export async function pollJob(jobId: string): Promise<AnalysisResult> {
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  while (true) {
    const res = await fetch(`${API_BASE}/api/jobs/${jobId}`);
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to fetch job status");
    }
    const job = data.job;
    if (job.status === "completed") {
      return transformResponse(job.result, job.payload?.youtube_url, job.payload?.text);
    }
    if (job.status === "failed") {
      throw new Error(job.error || "Analysis job failed");
    }
    await delay(3000); // Poll every 3 seconds
  }
}

export async function getJobs(): Promise<JobMetadata[]> {
  const res = await fetch(`${API_BASE}/api/jobs`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to fetch jobs");
  return data.jobs;
}

export async function getJobDetail(jobId: string): Promise<JobDetail> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Failed to fetch job detail");
  return data.job;
}

export async function deleteJob(jobId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    return data.success;
  } catch {
    return false;
  }
}

export async function analyzeText(text: string): Promise<AnalysisResult> {
  const form = new FormData();
  form.append("text", text);

  const res = await fetch(`${API_BASE}/api/analyze-text`, {
    method: "POST",
    body: form,
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Analysis submission failed");
  return pollJob(data.job_id);
}

export async function analyzeYoutube(url: string): Promise<AnalysisResult> {
  const form = new FormData();
  form.append("youtube_url", url);

  const res = await fetch(`${API_BASE}/api/analyze-video-youtube`, {
    method: "POST",
    body: form,
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Analysis submission failed");
  return pollJob(data.job_id);
}

export async function analyzeVideo(file: File): Promise<AnalysisResult> {
  const form = new FormData();
  form.append("video", file);

  const res = await fetch(`${API_BASE}/api/analyze-video`, {
    method: "POST",
    body: form,
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Analysis submission failed");
  return pollJob(data.job_id);
}

