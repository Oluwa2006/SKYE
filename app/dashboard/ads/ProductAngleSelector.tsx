"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { CircleNotch, ArrowsClockwise, Camera } from "@phosphor-icons/react";


interface Props {
  cleanImageUrl:  string;
  onAngleCapture: (url: string) => void;
  onClose:        () => void;
}

export default function ProductAngleSelector({ cleanImageUrl, onAngleCapture, onClose }: Props) {
  const [phase,     setPhase]     = useState<"idle" | "generating" | "ready" | "error">("idle");
  const [jobId,     setJobId]     = useState<string | null>(null);
  const [modelUrl,  setModelUrl]  = useState<string | null>(null);
  const [queuePos,  setQueuePos]  = useState<number | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const viewerRef = useRef<HTMLElement & { toBlob: (opts: { idealAspect: boolean }) => Promise<Blob> }>(null);
  const pollRef   = useRef<NodeJS.Timeout | null>(null);

  // ── Load model-viewer script from CDN ─────────────────────────────────────
  useEffect(() => {
    if (document.querySelector('script[data-model-viewer]')) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.type  = "module";
    script.src   = "https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js";
    script.setAttribute("data-model-viewer", "true");
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, []);

  // ── Trigger 3D generation ─────────────────────────────────────────────────
  const generate = useCallback(async () => {
    setPhase("generating");
    setError(null);
    setModelUrl(null);
    try {
      const res  = await fetch("/api/product/generate-3d", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ image_url: cleanImageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setJobId(data.job_id);
    } catch (err) {
      setError((err as Error).message);
      setPhase("error");
    }
  }, [cleanImageUrl]);

  useEffect(() => { generate(); }, [generate]);

  // ── Poll for completion ────────────────────────────────────────────────────
  useEffect(() => {
    if (!jobId || phase !== "generating") return;

    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/product/3d-status?job_id=${encodeURIComponent(jobId)}`);
        const data = await res.json();

        if (data.status === "done") {
          clearInterval(pollRef.current!);
          if (data.model_url) {
            setModelUrl(data.model_url);
            setPhase("ready");
          } else {
            setError("Model URL not returned — try again.");
            setPhase("error");
          }
        } else if (data.status === "failed") {
          clearInterval(pollRef.current!);
          setError(data.error ?? "Generation failed");
          setPhase("error");
        } else {
          setQueuePos(data.queue_position ?? null);
        }
      } catch { /* transient — keep polling */ }
    }, 5000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [jobId, phase]);

  // ── Capture current view from model-viewer ─────────────────────────────────
  async function captureAngle() {
    const viewer = viewerRef.current;
    if (!viewer) return;
    setCapturing(true);
    try {
      const blob = await viewer.toBlob({ idealAspect: false });

      const form = new FormData();
      form.append("file",   blob,           "product-angle.png");
      form.append("folder", "ad-products");
      const upRes  = await fetch("/api/upload", { method: "POST", body: form });
      const upData = await upRes.json();
      if (!upRes.ok) throw new Error(upData.error ?? "Upload failed");

      onAngleCapture(upData.url as string);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCapturing(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)" }}
    >
      <div
        className="relative rounded-[28px] overflow-hidden flex flex-col"
        style={{ width: 480, maxHeight: "90vh", background: "#ffffff", boxShadow: "0 32px 80px rgba(0,0,0,0.3)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "rgba(15,23,42,0.08)" }}>
          <div>
            <p className="text-sm font-bold" style={{ color: "#0f172a" }}>3D Angle Picker</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(15,23,42,0.45)" }}>
              Drag to rotate · pinch to zoom · capture any angle
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
            style={{ color: "rgba(15,23,42,0.4)", background: "rgba(15,23,42,0.05)" }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Generating */}
          {phase === "generating" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "#eff6ff" }}
              >
                <CircleNotch size={28} className="animate-spin" style={{ color: "#1d4ed8" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Building 3D model…</p>
                <p className="text-xs mt-1" style={{ color: "rgba(15,23,42,0.45)" }}>
                  {queuePos != null
                    ? `Queue position ${queuePos} — hang tight`
                    : "Generating mesh from your product image"}
                </p>
                <p className="text-[10px] mt-2" style={{ color: "rgba(15,23,42,0.3)" }}>
                  Usually takes 30–90 seconds
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {phase === "error" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 px-6">
              <p className="text-sm font-semibold text-center text-red-500">{error}</p>
              <button
                onClick={generate}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "#1d4ed8", color: "#fff" }}
              >
                <ArrowsClockwise size={15} /> Try again
              </button>
            </div>
          )}

          {/* Ready — interactive 3D viewer */}
          {phase === "ready" && modelUrl && scriptLoaded && (
            <div>
              {/* model-viewer */}
              <div className="relative" style={{ aspectRatio: "1/1", background: "#f8fafc" }}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <model-viewer
                  ref={viewerRef as any}
                  src={modelUrl}
                  alt="Product 3D model"
                  camera-controls
                  auto-rotate
                  shadow-intensity="1"
                  exposure="1"
                  style={{ width: "100%", height: "100%" }}
                />
                {/* Hint overlay */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
                  <span
                    className="text-[10px] font-semibold px-3 py-1 rounded-full"
                    style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)", color: "rgba(255,255,255,0.85)" }}
                  >
                    Drag to rotate · scroll to zoom
                  </span>
                </div>
              </div>

              {/* Tip */}
              <div className="px-5 py-3 border-t" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
                <p className="text-[11px] leading-relaxed" style={{ color: "rgba(15,23,42,0.45)" }}>
                  Position your product at the exact angle you want in the ad, then hit <strong>Capture angle</strong>. That frame becomes your product image.
                </p>
                {error && (
                  <p className="text-xs mt-2 text-red-500">{error}</p>
                )}
              </div>
            </div>
          )}

          {/* Script still loading */}
          {phase === "ready" && modelUrl && !scriptLoaded && (
            <div className="flex items-center justify-center py-10">
              <CircleNotch size={20} className="animate-spin" style={{ color: "#1d4ed8" }} />
            </div>
          )}
        </div>

        {/* Footer */}
        {phase === "ready" && (
          <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: "rgba(15,23,42,0.08)" }}>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-[14px] text-sm font-semibold border transition-colors"
              style={{ borderColor: "rgba(15,23,42,0.12)", color: "rgba(15,23,42,0.55)" }}
            >
              Cancel
            </button>
            <button
              onClick={captureAngle}
              disabled={capturing}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[14px] text-sm font-bold disabled:opacity-60"
              style={{ background: "#1d4ed8", color: "#fff" }}
            >
              {capturing
                ? <><CircleNotch size={15} className="animate-spin" /> Capturing…</>
                : <><Camera size={15} weight="fill" /> Capture angle</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
