"use client";

import { FormEvent, useMemo, useState } from "react";
import clsx from "clsx";

type StepState = "pending" | "active" | "complete" | "error";

type Step = {
  id: string;
  title: string;
  description: string;
  status: StepState;
};

type AgentLog = {
  id: string;
  label: string;
  body: string;
  tone: "info" | "success" | "warning" | "error";
};

type VideoResponse = {
  status: "processing" | "succeeded" | "mock" | "failed";
  videoUrl?: string;
  message?: string;
  predictionId?: string;
};

type AgentPlan = {
  theme: string;
  mood: string;
  keywords: string[];
  narrativeBeats: string[];
  visualDirectives: string[];
};

const styles = [
  { label: "Cinematic", value: "cinematic" },
  { label: "Anime", value: "anime" },
  { label: "Futuristic", value: "futuristic" },
  { label: "Documentary", value: "documentary" },
  { label: "Surreal", value: "surreal" },
  { label: "Minimalist", value: "minimalist" },
];

const aspectRatios = [
  { label: "16:9", value: "16:9" },
  { label: "9:16", value: "9:16" },
  { label: "1:1", value: "1:1" },
];

const baseSteps: Omit<Step, "status">[] = [
  {
    id: "analysis",
    title: "Prompt intelligence",
    description: "Extract semantic signals, mood, and pacing directives.",
  },
  {
    id: "storycraft",
    title: "Narrative construction",
    description: "Synthesize storyline beats and visual strategy.",
  },
  {
    id: "rendering",
    title: "Diffusion orchestration",
    description: "Invoke text-to-video model and monitor progress.",
  },
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const deriveAgentPlan = (prompt: string, style: string, duration: number): AgentPlan => {
  const sanitized = prompt.replace(/[^a-zA-Z0-9\s]/g, " ").toLowerCase();
  const tokens = sanitized.split(/\s+/).filter(Boolean);

  const tokenMap = tokens.reduce<Record<string, number>>((map, token) => {
    if (token.length < 4) return map;
    map[token] = (map[token] ?? 0) + 1;
    return map;
  }, {});

  const keywords = Object.entries(tokenMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => word);

  const moodVocabulary: Record<string, string> = {
    cinematic: "epic, high-contrast lighting, sweeping motion",
    anime: "vibrant, stylized, expressive action",
    futuristic: "neon-lit, high-tech ambience, dynamic transitions",
    documentary: "grounded, steady shots, observational tone",
    surreal: "dreamlike, fluid metaphors, impossible physics",
    minimalist: "clean framing, restrained palette, calm pacing",
  };

  const narrativeBeats = [
    `Hook: Introduce the core imagery around "${keywords[0] ?? "the main concept"}" immediately.`,
    "Development: Layer supporting visuals to evolve the scene with escalating motion cues.",
    "Climax: Converge tension with bold lighting and kinetic camera movement.",
    `Resolve: Land on a memorable tableau that echoes the ${style} style language.`,
  ];

  const visualDirectives = [
    `Duration target: ${duration} seconds with ${duration >= 16 ? "slow cinematic" : "energetic"} pacing arcs`,
    `Primary palette mood: ${moodVocabulary[style]}`,
    "Camera grammar: mix of wide establishing and tight hero shots for emotional contrast",
    "Motion design: emphasize smooth parallax, volumetric lighting, and particle accents",
  ];

  return {
    theme: prompt.trim().slice(0, 90) || "Untitled concept",
    mood: moodVocabulary[style],
    keywords,
    narrativeBeats,
    visualDirectives,
  };
};

export default function HomePage() {
  const [prompt, setPrompt] = useState("A bio-luminescent city floating above an ocean of clouds with aurora sky");
  const [style, setStyle] = useState(styles[0]!.value);
  const [aspectRatio, setAspectRatio] = useState(aspectRatios[0]!.value);
  const [duration, setDuration] = useState(12);
  const [steps, setSteps] = useState<Step[]>(
    baseSteps.map((step) => ({ ...step, status: "pending" }))
  );
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VideoResponse | null>(null);

  const plan = useMemo(() => deriveAgentPlan(prompt, style, duration), [prompt, style, duration]);

  const updateStep = (stepId: string, status: StepState) => {
    setSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, status } : step))
    );
  };

  const pushLog = (log: Omit<AgentLog, "id">) => {
    setLogs((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ...log,
      },
      ...prev,
    ]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    setLogs([]);
    setSteps(baseSteps.map((step) => ({ ...step, status: "pending" })));

    try {
      updateStep("analysis", "active");
      pushLog({
        label: "Semantic pass",
        body: "Tokenizing prompt and extracting salient entities, moods, and motion cues.",
        tone: "info",
      });
      await wait(400);
      updateStep("analysis", "complete");

      updateStep("storycraft", "active");
      pushLog({
        label: "Narrative synthesis",
        body: "Drafting multi-beat story arc and selecting cinematic motifs that align with the prompt.",
        tone: "info",
      });
      await wait(400);
      updateStep("storycraft", "complete");

      updateStep("rendering", "active");
      pushLog({
        label: "Model invocation",
        body: "Dispatching request to diffusion engine and monitoring inference lifecycle.",
        tone: "info",
      });

      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, style, aspectRatio, duration }),
      });

      if (!response.ok) {
        throw new Error("Video generation request failed");
      }

      const data = (await response.json()) as VideoResponse;

      if (data.status === "failed") {
        pushLog({
          label: "Generation failed",
          body: data.message ?? "The video model returned an error.",
          tone: "error",
        });
        updateStep("rendering", "error");
        setError(data.message ?? "The video model failed to generate an output.");
      } else {
        pushLog({
          label: data.status === "mock" ? "Mock preview" : "Render ready",
          body:
            data.status === "mock"
              ? "Using sample cinematic reel because no API credentials were provided."
              : "Video diffusion completed successfully.",
          tone: data.status === "mock" ? "warning" : "success",
        });
        updateStep("rendering", "complete");
      }

      setResult(data);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      updateStep("rendering", "error");
      pushLog({
        label: "Agent error",
        body: message,
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-8 pb-16">
      <header className="glass rounded-3xl border border-primary/20 p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <span className="inline-flex rounded-full bg-primary/20 px-4 py-1 text-xs tracking-wide text-primary-foreground">
              Autonomous Pipelines
            </span>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Prompt-to-video agent orchestration
            </h1>
            <p className="max-w-2xl text-base text-slate-300">
              Provide a creative brief and let the agent analyze, storyboard, and drive a
              state-of-the-art diffusion video model. Built for rapid iteration and deployable on
              Vercel in minutes.
            </p>
          </div>
          <div className="glass-alt gradient-border w-full max-w-xs rounded-2xl p-6 text-sm text-slate-200">
            <h2 className="mb-3 text-lg font-semibold text-accent">
              Generation blueprint
            </h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-slate-400">Concept</dt>
                <dd className="text-right font-medium text-slate-100">{plan.theme}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Mood</dt>
                <dd className="text-right font-medium text-slate-100">{plan.mood}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Duration</dt>
                <dd className="text-right font-medium text-slate-100">{duration}s</dd>
              </div>
            </dl>
          </div>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        <form
          onSubmit={handleSubmit}
          className="glass rounded-3xl border border-primary/20 p-8 shadow-lg"
        >
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.25em] text-slate-300">
                Creative prompt
              </label>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                required
                minLength={12}
                rows={6}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40"
                placeholder="Describe the narrative, environment, motion, and emotion you want to see."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-slate-300">Visual style</span>
                <select
                  value={style}
                  onChange={(event) => setStyle(event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-white outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40"
                >
                  {styles.map(({ label, value }) => (
                    <option key={value} value={value} className="bg-surface text-slate-900">
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-slate-300">Aspect ratio</span>
                <select
                  value={aspectRatio}
                  onChange={(event) => setAspectRatio(event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-white outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40"
                >
                  {aspectRatios.map(({ label, value }) => (
                    <option key={value} value={value} className="bg-surface text-slate-900">
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-slate-300">Duration (seconds)</span>
                <input
                  type="number"
                  min={4}
                  max={24}
                  value={duration}
                  onChange={(event) => setDuration(Number(event.target.value))}
                  className="rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-white outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40"
                />
              </label>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
                <p className="font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Agent heuristics
                </p>
                <p className="mt-2 leading-relaxed text-slate-200">
                  Keywords prioritized: {plan.keywords.join(", ") || "pending analysis"}.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={clsx(
                "group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r px-6 py-3 text-base font-semibold text-white transition", 
                "from-primary to-accent shadow-[0_20px_45px_-20px_rgba(109,93,252,0.9)]",
                isSubmitting && "opacity-60"
              )}
            >
              {isSubmitting ? "Orchestrating diffusion..." : "Generate cinematic video"}
              <span className="text-xl">↗</span>
            </button>

            {error && (
              <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}
          </div>
        </form>

        <aside className="flex flex-col gap-6">
          <div className="glass rounded-3xl border border-primary/20 p-6">
            <h2 className="mb-4 text-xl font-semibold text-slate-100">Agent pipeline</h2>
            <ol className="space-y-5">
              {steps.map((step, index) => (
                <li key={step.id} className="relative pl-8">
                  <span
                    className={clsx(
                      "absolute left-0 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                      step.status === "complete" && "bg-emerald-500/20 text-emerald-400",
                      step.status === "active" && "bg-primary/30 text-primary-foreground",
                      step.status === "pending" && "bg-white/10 text-slate-300",
                      step.status === "error" && "bg-red-500/30 text-red-200"
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">{step.title}</p>
                    <p className="text-xs text-slate-300">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="glass-alt rounded-3xl border border-accent/20 p-6">
            <h2 className="mb-4 text-xl font-semibold text-accent">Agent console</h2>
            <ul className="space-y-3">
              {logs.length === 0 && (
                <li className="rounded-2xl border border-white/5 bg-black/30 px-4 py-5 text-sm text-slate-300">
                  Awaiting prompt submission. Agent insights will stream here.
                </li>
              )}
              {logs.map((log) => (
                <li
                  key={log.id}
                  className={clsx(
                    "rounded-2xl border px-4 py-5 text-sm leading-relaxed",
                    log.tone === "info" && "border-primary/20 bg-primary/10 text-slate-200",
                    log.tone === "success" && "border-emerald-400/40 bg-emerald-400/10 text-emerald-100",
                    log.tone === "warning" && "border-yellow-400/40 bg-yellow-400/10 text-yellow-100",
                    log.tone === "error" && "border-red-400/40 bg-red-500/10 text-red-100"
                  )}
                >
                  <p className="font-semibold uppercase tracking-[0.2em] text-xs text-slate-300">
                    {log.label}
                  </p>
                  <p className="mt-2 text-sm">{log.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      <section className="glass rounded-3xl border border-primary/20 p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex-1 space-y-4">
            <h2 className="text-2xl font-semibold text-white">Storyboard strategy</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <h3 className="font-semibold text-slate-100">Narrative beats</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {plan.narrativeBeats.map((beat, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-accent" />
                      <span>{beat}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <h3 className="font-semibold text-slate-100">Visual directives</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {plan.visualDirectives.map((directive, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{directive}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="flex-1 rounded-3xl border border-white/10 bg-black/40 p-4">
            <h3 className="mb-4 text-lg font-semibold text-slate-100">Generated output</h3>
            {result?.videoUrl ? (
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/80">
                  <video
                    key={result.videoUrl}
                    controls
                    playsInline
                    className="w-full"
                  >
                    <source src={result.videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
                {result.message && (
                  <p className="text-xs text-slate-400">{result.message}</p>
                )}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20">
                <p className="text-sm text-slate-400">
                  Submit a prompt to synthesize a cinematic video sequence.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
