"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { analyzeText, analyzeYoutube, analyzeVideo, getJobs, getJobDetail, deleteJob, pollJob, transformResponse } from "./lib/api";
import type { AnalysisResult, JobMetadata, JobDetail, MetricKey, Segment } from "./lib/types";
import { METRIC_KEYS, METRIC_COLORS, METRIC_LABELS } from "./lib/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceDot,
  Label,
} from "recharts";

/** Find the peak segment for a metric */
function findPeak(
  segments: Segment[],
  key: MetricKey
): { timestep: number; value: number } {
  let best = segments[0];
  for (const seg of segments) {
    if (seg[key] > best[key]) best = seg;
  }
  return { timestep: best.timestep, value: best[key] };
}

type InputMode = "text" | "youtube" | "upload" | "load" | "jobs";

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId: string | null = null;
    if (u.hostname.includes("youtube.com")) {
      videoId = u.searchParams.get("v") || u.pathname.split("/").pop() || null;
    } else if (u.hostname.includes("youtu.be")) {
      videoId = u.pathname.slice(1);
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}

function downloadJson(data: AnalysisResult, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function HomePage() {
  const [mode, setMode] = useState<InputMode>("text");
  const [text, setText] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);

  const [jobs, setJobs] = useState<JobMetadata[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);

  const [visibleMetrics, setVisibleMetrics] = useState<Set<MetricKey>>(
    new Set(METRIC_KEYS)
  );

  const toggleMetric = useCallback((key: MetricKey) => {
    setVisibleMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const peaks = result
    ? METRIC_KEYS.filter((k) => visibleMetrics.has(k)).map((key) => ({
        key,
        ...findPeak(result.segments, key),
      }))
    : [];

  const fetchJobs = useCallback(async () => {
    setLoadingJobs(true);
    setJobsError(null);
    try {
      const data = await getJobs();
      setJobs(data);
    } catch (err) {
      setJobsError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  const handleTabChange = useCallback((newMode: InputMode) => {
    setMode(newMode);
    if (newMode === "jobs") {
      fetchJobs();
    }
  }, [fetchJobs]);

  const handleSelectJob = useCallback(async (jobId: string) => {
    setError(null);
    setLoading(true);
    try {
      const job = await getJobDetail(jobId);
      if (job.status === "completed" && job.result) {
        const transformed = transformResponse(job.result, job.payload?.youtube_url);
        setResult(transformed);
      } else if (job.status === "failed") {
        throw new Error(job.error || "Selected job has failed.");
      } else {
        const res = await pollJob(jobId);
        setResult(res);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load job details");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteJob = useCallback(async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this job?")) return;
    try {
      const success = await deleteJob(jobId);
      if (success) {
        setJobs((prev) => prev.filter((j) => j.job_id !== jobId));
      } else {
        alert("Failed to delete job.");
      }
    } catch (err) {
      alert("Error deleting job: " + err);
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      let data: AnalysisResult;
      if (mode === "text") {
        if (!text.trim()) throw new Error("Please enter some text to analyze.");
        data = await analyzeText(text);
      } else if (mode === "youtube") {
        if (!youtubeUrl.trim()) throw new Error("Please enter a YouTube URL.");
        data = await analyzeYoutube(youtubeUrl);
      } else {
        if (!file) throw new Error("Please select a video file to upload.");
        data = await analyzeVideo(file);
      }
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  }, [mode, text, youtubeUrl, file]);

  const handleLoadJson = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string) as AnalysisResult;
          if (!data.segments || !data.summary) {
            throw new Error("Invalid format — missing segments or summary.");
          }
          setResult(data);
          setError(null);
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to parse JSON file."
          );
        }
      };
      reader.readAsText(f);
    },
    []
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  const tabs: { key: InputMode; label: string; icon: string }[] = [
    { key: "text", label: "Text", icon: "📝" },
    { key: "youtube", label: "YouTube", icon: "▶️" },
    { key: "upload", label: "Upload", icon: "📁" },
    { key: "load", label: "Load JSON", icon: "📊" },
    { key: "jobs", label: "Jobs", icon: "⏱️" },
  ];

  // ─── FULL-SCREEN LOADING STATE ────────────────────────────────────
  if (loading) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4 min-h-screen">
        <div className="text-center max-w-md">
          {/* Brain animation */}
          <div className="text-7xl animate-brain-pulse mb-8">🧠</div>

          {/* Title */}
          <h2 className="text-2xl font-bold gradient-text mb-3">
            Analyzing Neural Responses
          </h2>

          {/* Progress shimmer bar */}
          <div className="w-64 h-1.5 rounded-full overflow-hidden mx-auto mb-6 bg-white/5">
            <div className="h-full w-full animate-shimmer rounded-full" />
          </div>

          {/* Explanation */}
          <p className="text-muted text-sm leading-relaxed mb-4">
            The TRIBE v2 model is extracting text, audio, and video features,
            then predicting brain activation across thousands of cortical
            vertices.
          </p>

          <div className="glass-card p-4 text-left text-xs text-muted/70 space-y-2">
            <p className="flex items-start gap-2">
              <span className="text-accent-light mt-0.5">⏱</span>
              <span>
                <strong className="text-foreground/80">
                  This takes 20–40 minutes
                </strong>{" "}
                for a 15-second YouTube video. Longer videos take
                proportionally more time.
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">🔬</span>
              <span>
                The model runs text embeddings, audio feature extraction
                (Whisper), and video frame encoding (V-JEPA) — then combines
                them to predict brain-level BOLD signal responses.
              </span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">💡</span>
              <span>
                Feel free to leave this tab open and come back later. The
                results will appear automatically when processing is
                complete.
              </span>
            </p>
          </div>

          {/* Floating particles decoration */}
          <div className="flex justify-center gap-3 mt-6">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-accent-light/30 animate-float"
                style={{ animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ─── MAIN UI ──────────────────────────────────────────────────────
  return (
    <main className="flex-1 flex flex-col items-center px-4 py-12 sm:py-20">
      {/* Header */}
      <div className="text-center mb-10 max-w-2xl mt-4">
        <h1 className="text-4xl sm:text-5xl font-bold gradient-text mb-4">
          NeuroSignal
        </h1>
        <p className="text-muted text-lg leading-relaxed mb-6">
          Predict brain-level neural responses to text and video content using
          the TRIBE v2 model. Enter text, paste a YouTube URL, or upload a
          video.
        </p>

        {/* Local Model Warning Banner */}
        <div className="bg-red-500/10 border border-red-500/20 text-red-400/90 text-sm py-2 px-4 rounded-lg inline-flex items-center gap-2 mb-2">
          <span>⚠️</span>
          <span className="font-medium">Note:</span> This currently only works with locally loaded models via the Python API server.
        </div>

        <div className="mt-2">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 text-sm text-accent-light hover:text-accent transition-colors"
          >
            <span className="animate-pulse-dot inline-block w-2 h-2 rounded-full bg-accent-light" />
            View Demo Visualization →
          </Link>
        </div>
      </div>

      {/* Input Card */}
      <div className="glass-card glow w-full max-w-2xl p-6 sm:p-8">
        {/* Mode Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex-1 py-3 px-3 rounded-xl text-sm font-medium border transition-all cursor-pointer ${
                mode === tab.key
                  ? "tab-active text-foreground"
                  : "border-transparent text-muted hover:text-foreground hover:bg-white/5"
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Text Input */}
        {mode === "text" && (
          <textarea
            id="text-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or type text content to analyze..."
            rows={5}
            className="w-full bg-white/5 border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 resize-none font-mono text-sm"
          />
        )}

        {/* YouTube Input */}
        {mode === "youtube" && (
          <input
            id="youtube-input"
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full bg-white/5 border border-card-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 font-mono text-sm"
          />
        )}

        {/* File Upload */}
        {mode === "upload" && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-card-border rounded-xl px-6 py-12 text-center cursor-pointer hover:border-accent/40 hover:bg-white/5 transition-all"
          >
            <input
              id="file-input"
              ref={fileRef}
              type="file"
              accept="video/*,image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file ? (
              <div>
                <p className="text-foreground font-medium">{file.name}</p>
                <p className="text-muted text-sm mt-1">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-muted text-lg mb-1">
                  Drop a video or image here
                </p>
                <p className="text-muted/50 text-sm">
                  or click to browse — .mp4, .webm, .jpg, .png
                </p>
              </div>
            )}
          </div>
        )}

        {/* Load JSON */}
        {mode === "load" && (
          <div
            onClick={() => jsonRef.current?.click()}
            className="w-full border-2 border-dashed border-card-border rounded-xl px-6 py-12 text-center cursor-pointer hover:border-accent/40 hover:bg-white/5 transition-all"
          >
            <input
              id="json-input"
              ref={jsonRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleLoadJson}
            />
            <p className="text-muted text-lg mb-1">
              Load a NeuroSignal JSON report
            </p>
            <p className="text-muted/50 text-sm">
              Click to browse — must match the standard export format
            </p>
          </div>
        )}

        {/* Jobs list */}
        {mode === "jobs" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted uppercase tracking-wider">
                Current & Past Jobs
              </h3>
              <button
                onClick={fetchJobs}
                disabled={loadingJobs}
                className="text-xs text-accent-light hover:text-accent border border-card-border hover:border-accent/40 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
              >
                🔄 Refresh
              </button>
            </div>

            {loadingJobs && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent mb-2"></div>
                <p className="text-muted text-sm">Fetching jobs...</p>
              </div>
            )}

            {jobsError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {jobsError}
              </div>
            )}

            {!loadingJobs && !jobsError && jobs.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-card-border rounded-xl">
                <p className="text-muted text-sm">No analysis jobs found.</p>
                <p className="text-muted/50 text-xs mt-1">Submit an analysis to start a job.</p>
              </div>
            )}

            {!loadingJobs && !jobsError && jobs.length > 0 && (
              <div className="max-h-[350px] overflow-y-auto pr-1 space-y-2.5">
                {jobs.map((job) => (
                  <div
                    key={job.job_id}
                    onClick={() => handleSelectJob(job.job_id)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-card-border bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                          job.status === "completed" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                          job.status === "failed" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                          job.status === "processing" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse" :
                          "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                        }`}>
                          {job.status.toUpperCase()}
                        </span>
                        <span className="text-xs text-muted uppercase font-mono bg-white/5 px-1.5 py-0.5 rounded">
                          {job.type}
                        </span>
                        <span className="text-xs text-muted/60 font-mono hidden sm:inline">
                          id: {job.job_id.slice(0, 8)}...
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">
                        {job.type === "text" && (job.payload?.text || "Text Analysis")}
                        {job.type === "youtube" && (job.payload?.youtube_url || "YouTube Video")}
                        {job.type === "video" && (job.payload?.filename || "Uploaded Video")}
                      </p>
                      <p className="text-xs text-muted/60 mt-1">
                        {new Date(job.created_at).toLocaleString()}
                      </p>
                      {job.error && (
                        <p className="text-xs text-red-400 mt-1 truncate">
                          Error: {job.error}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-3 sm:mt-0 justify-end">
                      {job.status === "completed" && (
                        <Link
                          href={`/demo?jobId=${job.job_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-cyan-400 hover:text-cyan-300 font-medium px-3 py-1.5 rounded-lg border border-cyan-400/20 hover:border-cyan-400/40 bg-cyan-400/5 transition-all"
                        >
                          📊 Visualize
                        </Link>
                      )}
                      <button
                        onClick={(e) => handleDeleteJob(e, job.job_id)}
                        className="text-xs text-red-400 hover:text-red-300 border border-red-500/10 hover:border-red-500/30 px-3 py-1.5 rounded-lg cursor-pointer bg-red-500/5 transition-all"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Analyze Button (not shown for load or jobs mode) */}
        {mode !== "load" && mode !== "jobs" && (
          <button
            id="analyze-button"
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full mt-6 py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-accent to-yellow-500 text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer"
          >
            🧠 Analyze
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="glass-card glow w-full max-w-2xl mt-8 p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold gradient-text">
              Analysis Results
            </h2>
            <button
              onClick={() =>
                downloadJson(result, `neurosignal-${Date.now()}.json`)
              }
              className="text-xs text-accent-light hover:text-accent border border-accent/30 hover:border-accent/60 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
            >
              ⬇ Download JSON
            </button>
          </div>

          {/* YouTube Embed */}
          {result.youtubeUrl && getYouTubeEmbedUrl(result.youtubeUrl) && (
            <div className="mb-6 rounded-xl overflow-hidden border border-card-border">
              <iframe
                src={getYouTubeEmbedUrl(result.youtubeUrl)!}
                title="YouTube video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full aspect-video"
              />
            </div>
          )}

          {/* Summary */}
          <div className="mb-6">
            <p className="text-sm text-muted uppercase tracking-wider mb-1">
              Summary
            </p>
            <p className="text-foreground leading-relaxed">{result.summary}</p>
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-sm text-muted mb-1">Timesteps</p>
              <p className="text-2xl font-bold text-accent-light">
                {result.timestamps}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-sm text-muted mb-1">Status</p>
              <p className="text-sm text-foreground">{result.statusInfo}</p>
            </div>
          </div>

          {result.youtubeUrl && (
            <div className="mb-6">
              <p className="text-sm text-muted mb-1">YouTube URL</p>
              <a
                href={result.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-light hover:underline text-sm font-mono break-all"
              >
                {result.youtubeUrl}
              </a>
            </div>
          )}

          {/* Line Chart */}
          <div className="mb-8">
            <h3 className="text-sm text-muted uppercase tracking-wider mb-4">
              Brain Activation Over Time
            </h3>

            {/* Legend / Toggle */}
            <div className="flex flex-wrap gap-2 mb-4">
              {METRIC_KEYS.map((key) => {
                const active = visibleMetrics.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleMetric(key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      active
                        ? "border-white/20 bg-white/10 text-foreground"
                        : "border-transparent bg-white/5 text-muted/50"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: active ? METRIC_COLORS[key] : "#333",
                      }}
                    />
                    {METRIC_LABELS[key]}
                  </button>
                );
              })}
            </div>

            {/* Chart Container */}
            <div className="bg-white/5 rounded-xl p-4">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart
                  data={result.segments}
                  margin={{ top: 20, right: 30, bottom: 10, left: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="timestep"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    label={{
                      value: "Timestep (seconds)",
                      position: "insideBottom",
                      offset: -5,
                      fill: "#64748b",
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    domain={[0, "auto"]}
                    label={{
                      value: "Activation",
                      angle: -90,
                      position: "insideLeft",
                      offset: 10,
                      fill: "#64748b",
                      fontSize: 11,
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0a0a0a",
                      border: "1px solid rgba(225, 29, 72, 0.3)",
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: "#e2e8f0",
                    }}
                    labelFormatter={(val) => `Timestep ${val}s`}
                  />
                  <Legend content={() => null} />
                  {METRIC_KEYS.map((key) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={METRIC_LABELS[key]}
                      stroke={METRIC_COLORS[key]}
                      strokeWidth={key === "overall" ? 3 : 2}
                      strokeDasharray={key === "overall" ? "6 3" : undefined}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      hide={!visibleMetrics.has(key)}
                    />
                  ))}
                  {/* Peak labels */}
                  {peaks.map((p) => (
                    <ReferenceDot
                      key={`peak-${p.key}`}
                      x={p.timestep}
                      y={p.value}
                      r={4}
                      fill={METRIC_COLORS[p.key]}
                      stroke="none"
                    >
                      <Label
                        value={`${p.value.toFixed(1)}`}
                        position="top"
                        offset={8}
                        fill={METRIC_COLORS[p.key]}
                        fontSize={10}
                        fontWeight={600}
                      />
                    </ReferenceDot>
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Peak Metrics */}
          <div className="mb-6">
            <p className="text-sm text-muted uppercase tracking-wider mb-3">
              Peak Activation per Region
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {METRIC_KEYS.filter((k) => k !== "overall").map((key) => {
                const peak = Math.max(...result.segments.map((s) => s[key]));
                return (
                  <div
                    key={key}
                    className="bg-white/5 rounded-xl p-3 text-center"
                  >
                    <div
                      className="w-3 h-3 rounded-full mx-auto mb-2"
                      style={{ backgroundColor: METRIC_COLORS[key] }}
                    />
                    <p className="text-xs text-muted">{METRIC_LABELS[key]}</p>
                    <p
                      className="text-lg font-bold"
                      style={{ color: METRIC_COLORS[key] }}
                    >
                      {peak.toFixed(1)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* JSON Output */}
          <details className="group">
            <summary className="text-sm text-muted cursor-pointer hover:text-foreground">
              View Raw JSON Response
            </summary>
            <pre className="mt-3 bg-white/5 rounded-xl p-4 text-xs font-mono text-muted overflow-x-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </main>
  );
}
