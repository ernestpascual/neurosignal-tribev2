import type { AnalysisResult } from "./types";

export const DEMO_DATA: AnalysisResult = {
  summary:
    "Analyzed 16 timesteps. Peak brain activation at t=6 (18.0 norm units). Strongest grouped metric: Visual. Activation is above average across 62% of duration.",
  youtubeUrl: "https://www.youtube.com/watch?v=IwTWURBKzY0",
  timestamps: 16,
  statusInfo: "Analyzed 16 timesteps — 16 chart points.",
  segments: [
    { timestep: 0, overall: 8.4, Attention: 7.75, Auditory: 7.55, Emotion: 8.01, Language: 9.03, Motor: 8.84, Visual: 9.22 },
    { timestep: 1, overall: 13.84, Attention: 12.96, Auditory: 13.12, Emotion: 13.13, Language: 14.43, Motor: 14.33, Visual: 15.07 },
    { timestep: 2, overall: 12.49, Attention: 11.72, Auditory: 11.49, Emotion: 12.11, Language: 13.09, Motor: 12.53, Visual: 13.98 },
    { timestep: 3, overall: 13.95, Attention: 13.12, Auditory: 12.82, Emotion: 13.53, Language: 14.63, Motor: 13.96, Visual: 15.63 },
    { timestep: 4, overall: 15.31, Attention: 14.69, Auditory: 14.31, Emotion: 14.97, Language: 15.83, Motor: 15.04, Visual: 17.01 },
    { timestep: 5, overall: 17.4, Attention: 16.99, Auditory: 16.37, Emotion: 17.59, Language: 17.68, Motor: 16.68, Visual: 19.08 },
    { timestep: 6, overall: 18.02, Attention: 17.43, Auditory: 16.79, Emotion: 18.18, Language: 18.44, Motor: 17.36, Visual: 19.9 },
    { timestep: 7, overall: 17.94, Attention: 17.46, Auditory: 16.67, Emotion: 18.47, Language: 18.16, Motor: 17.14, Visual: 19.72 },
    { timestep: 8, overall: 17.86, Attention: 17.3, Auditory: 16.57, Emotion: 18.33, Language: 18.13, Motor: 17.08, Visual: 19.71 },
    { timestep: 9, overall: 16.86, Attention: 16.24, Auditory: 15.5, Emotion: 17.31, Language: 17.18, Motor: 16.24, Visual: 18.67 },
    { timestep: 10, overall: 17.18, Attention: 16.52, Auditory: 15.79, Emotion: 17.61, Language: 17.51, Motor: 16.68, Visual: 18.97 },
    { timestep: 11, overall: 16.45, Attention: 15.84, Auditory: 15.07, Emotion: 16.82, Language: 16.8, Motor: 16.03, Visual: 18.16 },
    { timestep: 12, overall: 15.8, Attention: 15.12, Auditory: 14.4, Emotion: 16.09, Language: 16.21, Motor: 15.48, Visual: 17.47 },
    { timestep: 13, overall: 15.22, Attention: 14.55, Auditory: 13.93, Emotion: 15.45, Language: 15.63, Motor: 15.08, Visual: 16.69 },
    { timestep: 14, overall: 13.31, Attention: 12.58, Auditory: 12.18, Emotion: 13.18, Language: 13.93, Motor: 13.55, Visual: 14.44 },
    { timestep: 15, overall: 10.75, Attention: 10.34, Auditory: 10.07, Emotion: 10.32, Language: 11.3, Motor: 11.23, Visual: 11.25 },
  ],
};
