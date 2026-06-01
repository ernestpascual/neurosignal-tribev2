"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getJobDetail, transformResponse } from "../lib/api";
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
import { DEMO_DATA } from "../lib/demo-data";
import { METRIC_KEYS, METRIC_COLORS, METRIC_LABELS } from "../lib/types";
import type { AnalysisResult, MetricKey, Segment } from "../lib/types";

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

function DemoPageContent() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const [data, setData] = useState<AnalysisResult>(DEMO_DATA);
  const [visibleMetrics, setVisibleMetrics] = useState<Set<MetricKey>>(
    new Set(METRIC_KEYS)
  );
  const jsonRef = useRef<HTMLInputElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    getJobDetail(jobId)
      .then((job) => {
        if (job.status === "completed" && job.result) {
          setData(transformResponse(job.result, job.payload?.youtube_url));
        } else if (job.status === "failed") {
          setError(job.error || "Selected job has failed.");
        } else {
          setError(`Job is currently ${job.status}. Please wait for it to complete.`);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load job details.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [jobId]);

  const toggleMetric = (key: MetricKey) => {
    setVisibleMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleLoadJson = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(
            ev.target?.result as string
          ) as AnalysisResult;
          if (!parsed.segments || !parsed.summary) {
            throw new Error("Invalid format — missing segments or summary.");
          }
          setData(parsed);
          setLoadError(null);
        } catch (err) {
          setLoadError(
            err instanceof Error ? err.message : "Failed to parse JSON."
          );
        }
      };
      reader.readAsText(f);
      e.target.value = "";
    },
    []
  );

  if (loading) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-5xl animate-brain-pulse mb-4">🧠</div>
          <p className="text-muted text-sm">Loading job data from server...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="glass-card max-w-md p-6 sm:p-8 glow">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-400 mb-2">Failed to Load Job</h2>
          <p className="text-muted text-sm mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block text-xs font-semibold bg-white/10 hover:bg-white/15 px-4 py-2 rounded-lg border border-white/10 transition-colors cursor-pointer"
          >
            ← Back to Home
          </Link>
        </div>
      </main>
    );
  }

  // Compute stats
  const peakTimestep = data.segments.reduce((best, seg) =>
    seg.overall > best.overall ? seg : best
  );
  const avgOverall =
    data.segments.reduce((s, seg) => s + seg.overall, 0) / data.segments.length;

  // Peak dots for the chart
  const peaks = METRIC_KEYS.filter((k) => visibleMetrics.has(k)).map((key) => ({
    key,
    ...findPeak(data.segments, key),
  }));

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-12 sm:py-16">
      {/* Header */}
      <div className="text-center mb-10 max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-6 transition-colors"
        >
          ← Back to Analyzer
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-3">
          Brain Activation Report
        </h1>
        <p className="text-muted text-base">
          Neural response analysis powered by TRIBE v2.
        </p>
      </div>

      {/* Report Card */}
      <div className="glass-card glow w-full max-w-4xl p-6 sm:p-8 mb-8">
        {/* Actions Bar */}
        <div className="flex items-center justify-end gap-2 mb-6">
          <button
            onClick={() => jsonRef.current?.click()}
            className="text-xs text-muted hover:text-foreground border border-card-border hover:border-accent/40 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
          >
            📂 Load JSON
          </button>
          <input
            ref={jsonRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleLoadJson}
          />
          <button
            onClick={() =>
              downloadJson(data, `neurosignal-${Date.now()}.json`)
            }
            className="text-xs text-accent-light hover:text-accent border border-accent/30 hover:border-accent/60 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
          >
            ⬇ Download JSON
          </button>
        </div>

        {loadError && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {loadError}
          </div>
        )}

        {/* YouTube Embed */}
        {data.youtubeUrl && getYouTubeEmbedUrl(data.youtubeUrl) && (
          <div className="mb-6 rounded-xl overflow-hidden border border-card-border">
            <iframe
              src={getYouTubeEmbedUrl(data.youtubeUrl)!}
              title="YouTube video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full aspect-video"
            />
          </div>
        )}

        {/* Summary */}
        <div className="mb-6">
          <h2 className="text-sm text-muted uppercase tracking-wider mb-2">
            Summary
          </h2>
          <p className="text-foreground leading-relaxed text-lg">
            {data.summary}
          </p>
        </div>

        {/* Meta Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {data.youtubeUrl && (
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-xs text-muted uppercase tracking-wider mb-1">
                YouTube URL
              </p>
              <a
                href={data.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-light hover:underline text-sm font-mono break-all"
              >
                {data.youtubeUrl}
              </a>
            </div>
          )}
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-xs text-muted uppercase tracking-wider mb-1">
              Timesteps
            </p>
            <p className="text-2xl font-bold text-accent-light">
              {data.timestamps}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-xs text-muted uppercase tracking-wider mb-1">
              Status
            </p>
            <p className="text-sm text-foreground mt-1">{data.statusInfo}</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <p className="text-xs text-muted mb-1">Peak Timestep</p>
            <p className="text-2xl font-bold text-accent-light">
              t={peakTimestep.timestep}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <p className="text-xs text-muted mb-1">Peak Overall</p>
            <p className="text-2xl font-bold text-cyan-400">
              {peakTimestep.overall.toFixed(1)}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 text-center">
            <p className="text-xs text-muted mb-1">Average Overall</p>
            <p className="text-2xl font-bold text-green-400">
              {avgOverall.toFixed(1)}
            </p>
          </div>
        </div>

        {/* Line Chart */}
        <div className="mb-6">
          <h2 className="text-sm text-muted uppercase tracking-wider mb-4">
            Brain Activation Over Time
          </h2>

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

          {/* Chart */}
          <div className="bg-white/5 rounded-xl p-4">
            <ResponsiveContainer width="100%" height={420}>
              <LineChart
                data={data.segments}
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
                    value: "Activation (scaled BOLD)",
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
                    border: "1px solid rgba(124, 58, 237, 0.3)",
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

        {/* Data Table */}
        <div>
          <h2 className="text-sm text-muted uppercase tracking-wider mb-4">
            All Timestep Values
          </h2>
          <div className="overflow-x-auto rounded-xl border border-card-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5">
                  <th className="px-4 py-3 text-left font-medium text-accent-light">
                    Time
                  </th>
                  {METRIC_KEYS.map((key) => (
                    <th
                      key={key}
                      className="px-4 py-3 text-left font-medium"
                      style={{ color: METRIC_COLORS[key] }}
                    >
                      {METRIC_LABELS[key]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.segments.map((seg, i) => (
                  <tr
                    key={seg.timestep}
                    className={`border-t border-card-border ${
                      i % 2 === 0 ? "" : "bg-white/[0.02]"
                    }`}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-accent-light font-medium">
                      t={seg.timestep}
                    </td>
                    {METRIC_KEYS.map((key) => (
                      <td
                        key={key}
                        className="px-4 py-2.5 font-mono text-xs"
                        style={{ color: METRIC_COLORS[key] }}
                      >
                        {seg[key].toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Metric Explainer */}
        <div className="mt-8">
          <h2 className="text-sm text-muted uppercase tracking-wider mb-4">
            Understanding the Metrics
          </h2>
          <p className="text-muted text-sm mb-4 leading-relaxed">
            Each metric represents predicted BOLD signal fluctuations (standard
            deviations × 100) in a specific brain network. The raw model outputs
            are typically between <strong className="text-foreground">−3.0 to +3.0</strong> standard deviations per vertex.
            After taking the absolute value, averaging across all vertices in a region,
            and scaling by 100, the final values typically fall in the
            range <strong className="text-foreground">5.0 to 30.0</strong>.
          </p>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-green-400">5 – 10</p>
              <p className="text-xs text-muted mt-1">Low activation — resting or minimal stimulus</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-amber-400">10 – 18</p>
              <p className="text-xs text-muted mt-1">Moderate — typical range for engaging content</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-red-400">18 – 30</p>
              <p className="text-xs text-muted mt-1">High — intense, highly stimulating moments</p>
            </div>
          </div>
          <p className="text-muted text-xs mb-5 leading-relaxed">
            For example, a Visual score of <strong className="text-foreground">15.0</strong> means the visual cortex vertices
            are deviating by an average of 0.15 standard deviations from their resting baseline —
            indicating moderate visual engagement. A score above 19 would indicate a highly stimulating visual moment.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-xl p-4 border-l-2" style={{ borderLeftColor: METRIC_COLORS.overall }}>
              <h3 className="font-semibold text-sm mb-1" style={{ color: METRIC_COLORS.overall }}>
                Overall
              </h3>
              <p className="text-muted text-xs leading-relaxed">
                The global average activation across the entire brain surface. Gives a quick snapshot of how generally stimulating the content is at any given second.
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border-l-2" style={{ borderLeftColor: METRIC_COLORS.Attention }}>
              <h3 className="font-semibold text-sm mb-1" style={{ color: METRIC_COLORS.Attention }}>
                Attention
              </h3>
              <p className="text-muted text-xs leading-relaxed">
                Focus and spatial awareness centers (prefrontal & parietal cortex). Spikes when the content requires the viewer to actively track moving objects, read text, or focus on a specific point.
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border-l-2" style={{ borderLeftColor: METRIC_COLORS.Auditory }}>
              <h3 className="font-semibold text-sm mb-1" style={{ color: METRIC_COLORS.Auditory }}>
                Auditory
              </h3>
              <p className="text-muted text-xs leading-relaxed">
                Auditory cortex activation in the temporal lobe. Spikes during dialogue, loud sound effects, music transitions, or any acoustically rich moment.
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border-l-2" style={{ borderLeftColor: METRIC_COLORS.Emotion }}>
              <h3 className="font-semibold text-sm mb-1" style={{ color: METRIC_COLORS.Emotion }}>
                Emotion
              </h3>
              <p className="text-muted text-xs leading-relaxed">
                Limbic system and emotional processing centers (e.g. amygdala). Indicates how emotionally stimulating or evocative the content is predicted to be — humor, surprise, tension, or sentimentality.
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border-l-2" style={{ borderLeftColor: METRIC_COLORS.Language }}>
              <h3 className="font-semibold text-sm mb-1" style={{ color: METRIC_COLORS.Language }}>
                Language
              </h3>
              <p className="text-muted text-xs leading-relaxed">
                Language comprehension areas (Wernicke&apos;s & Broca&apos;s areas). Spikes when someone is speaking clearly, when text appears on screen, or during narration and voiceover.
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border-l-2" style={{ borderLeftColor: METRIC_COLORS.Motor }}>
              <h3 className="font-semibold text-sm mb-1" style={{ color: METRIC_COLORS.Motor }}>
                Motor
              </h3>
              <p className="text-muted text-xs leading-relaxed">
                Motor cortex activation. Due to the brain&apos;s mirror neuron system, this spikes when watching physical actions — running, dancing, hand gestures — even when the viewer is sitting completely still.
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border-l-2 sm:col-span-2" style={{ borderLeftColor: METRIC_COLORS.Visual }}>
              <h3 className="font-semibold text-sm mb-1" style={{ color: METRIC_COLORS.Visual }}>
                Visual
              </h3>
              <p className="text-muted text-xs leading-relaxed">
                Visual cortex in the occipital lobe, responsible for processing what the eyes are seeing. Typically the highest value since video content is inherently visual. Spikes during scene changes, fast motion, bright colors, and visually complex frames.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={
      <main className="flex-1 flex flex-col items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-5xl animate-brain-pulse mb-4">🧠</div>
          <p className="text-muted text-sm">Loading visualization...</p>
        </div>
      </main>
    }>
      <DemoPageContent />
    </Suspense>
  );
}
