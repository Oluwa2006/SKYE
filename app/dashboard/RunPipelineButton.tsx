"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, RefreshCw, Play, AlertCircle, X } from "lucide-react";

type RunStatus = "idle" | "running" | "complete" | "failed";

const STAGE_LABELS: Record<string, string> = {
  scrape:           "Scraping sources...",
  analyze:          "Analysing posts...",
  "generate-ideas": "Generating ideas...",
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function RunPipelineButton() {
  const [status, setStatus] = useState<RunStatus>("idle");
  const [stage,   setStage]  = useState("");
  const [lastRun, setLastRun] = useState<any>(null);

  useEffect(() => {
    fetch("/api/pipeline-status")
      .then(r => r.json())
      .then(({ run }) => { if (run) setLastRun(run); });
  }, []);

  async function handleRun() {
    setStatus("running");
    setStage("scrape");

    try {
      const res  = await fetch("/api/run-pipeline", { cache: "no-store" });
      const data = await res.json();

      if (res.status === 409) {
        // Auto-reset the stuck run and retry once
        setStage("Clearing stuck run…");
        await fetch("/api/pipeline-status", { method: "DELETE" });
        const retry = await fetch("/api/run-pipeline", { cache: "no-store" });
        const retryData = await retry.json();
        if (!retry.ok) {
          setStatus("failed");
          setStage(retryData.error || "Pipeline failed.");
          return;
        }
        // fall through to success handling below
        setStage("analyze");
        await new Promise(r => setTimeout(r, 400));
        setStage("generate-ideas");
        await new Promise(r => setTimeout(r, 400));
        setStatus("complete");
        setStage("");
        setLastRun({ status: "complete", completed_at: new Date().toISOString() });
        return;
      }
      if (!res.ok) {
        setStatus("failed");
        setStage(data.error || "Pipeline failed.");
        return;
      }

      setStage("analyze");
      await new Promise(r => setTimeout(r, 400));
      setStage("generate-ideas");
      await new Promise(r => setTimeout(r, 400));

      setStatus("complete");
      setStage("");
      setLastRun({ status: "complete", completed_at: new Date().toISOString() });
    } catch {
      setStatus("failed");
      setStage("Something went wrong.");
    }
  }

  function handleRunAgain() {
    setStatus("idle");
    setStage("");
    handleRun();
  }

  // ── Running ──────────────────────────────────────────────────────────────
  if (status === "running") {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <button disabled className="rounded-lg bg-blue-600 text-white px-4 py-2.5 text-sm font-semibold opacity-80 flex items-center gap-2 shadow-sm">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-blue-300 border-t-white animate-spin shrink-0" />
          {STAGE_LABELS[stage] ?? "Running..."}
        </button>
        <p className="text-[11px] text-dm pl-1">Pipeline in progress</p>
      </div>
    );
  }

  // ── Complete ─────────────────────────────────────────────────────────────
  if (status === "complete") {
    return (
      <div className="flex flex-col items-start gap-2">
        {/* Done indicator + dismiss */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
            <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
            <span className="text-sm font-semibold text-emerald-700">Pipeline complete</span>
          </div>
          <button
            onClick={() => { setStatus("idle"); setStage(""); }}
            className="p-2 rounded-lg border border-glass text-dm hover:text-dp hover:glass-sub transition"
            title="Dismiss"
          >
            <X size={13} />
          </button>
        </div>

        {/* Run again + last run info */}
        <div className="flex items-center gap-3 pl-1">
          <button
            onClick={handleRunAgain}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-500 hover:text-blue-700 transition"
          >
            <RefreshCw size={11} strokeWidth={2.2} />
            Run again for new ideas
          </button>
          {lastRun?.completed_at && (
            <span className="text-[11px] text-dm">
              {timeAgo(lastRun.completed_at)}
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── Failed ───────────────────────────────────────────────────────────────
  if (status === "failed") {
    return (
      <div className="flex flex-col items-start gap-2">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 border border-red-200">
          <AlertCircle size={15} className="text-red-400 shrink-0" />
          <span className="text-sm font-semibold text-red-600">Pipeline failed</span>
        </div>
        <div className="flex items-center gap-3 pl-1">
          <p className="text-[11px] text-red-400">{stage}</p>
          <button
            onClick={() => { setStatus("idle"); setStage(""); }}
            className="text-[11px] font-semibold text-dm hover:text-dp transition underline"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // ── Idle ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        onClick={handleRun}
        className="rounded-lg bg-blue-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 transition shadow-sm flex items-center gap-2"
      >
        <Play size={13} strokeWidth={2} className="shrink-0" />
        Run Pipeline
      </button>
      {lastRun && (
        <p className="text-[11px] text-dm font-medium pl-1">
          Last run:{" "}
          <span className={lastRun.status === "complete" ? "text-emerald-500" : "text-red-400"}>
            {lastRun.status}
          </span>
          {lastRun.completed_at && ` · ${timeAgo(lastRun.completed_at)}`}
        </p>
      )}
    </div>
  );
}
