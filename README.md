# NeuroSignal Frontend 🧠

NeuroSignal is a modern, responsive React/Next.js frontend designed to interface with the **TRIBE v2 Neural Responses API** (`tribev2server`). It allows you to input content (text, video, or YouTube URLs) and visualize how the human brain is predicted to react to it over time.

## ⚠️ Important Note

This frontend is designed to communicate with the locally-hosted Python FastAPI server running the [TRIBE v2 meta-model](https://github.com/ernestpascual/tribev2-experiment).

Before running this frontend, ensure your backend API is running on port `7860`:

```bash
cd ../tribev2server
uvicorn app:app --host 0.0.0.0 --port 7860
```

## Features

- **3 Analysis Modes**:
  - 📝 **Text**: Analyze how the brain responds to reading specific text.
  - ▶️ **YouTube**: Paste a public YouTube link to automatically extract and analyze the video and audio features.
  - 📁 **Upload**: Drag-and-drop local `.mp4` or `.webm` files.
- **Brain Activation Visualizations**:
  - A dedicated `/demo` visualization route powered by `recharts`.
  - Interactive line charts mapping BOLD signal fluctuations across 6 distinct brain networks (_Attention, Auditory, Emotion, Language, Motor, Visual_).
  - Auto-calculated peak activation timestamps.
- **Save & Load Reports**:
  - Download the raw JSON neural reports after an analysis.
  - Load previously generated JSON reports straight into the analyzer to view the charts instantly.
- **Premium UI/UX**:
  - Built with Tailwind CSS.
  - Features a dark "glassmorphism" aesthetic with glowing accents, gradient typography, and custom loading animations.

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.
Navigate to [http://localhost:3000/demo](http://localhost:3000/demo) to see the visualization dashboard with sample data.

## Technology Stack

- **Framework**: Next.js 14 / React 18
- **Styling**: Tailwind CSS
- **Charting**: Recharts
- **Icons/Fonts**: Geist Sans & Mono
- **Backend**: Requires the FastAPI `tribev2server` (Python, PyTorch, HuggingFace)
